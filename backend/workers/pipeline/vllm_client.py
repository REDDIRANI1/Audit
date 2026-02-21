"""
vLLM Client – High-Throughput LLM Inference.

vLLM (https://github.com/vllm-project/vllm) provides an OpenAI-compatible API
optimized for multi-user, multi-gpu serving. This client handles:
- Asynchronous batching (native to vLLM)
- Fast JSON mode
- Priority-based scheduling (via vLLM server)
- Fallback logic
"""
import json
import logging
import os
import re
from typing import Dict, List, Any, Optional

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

logger = logging.getLogger(__name__)

# Use OpenAI defaults if not overridden
VLLM_BASE_URL = os.environ.get("VLLM_BASE_URL", "http://localhost:8000/v1")
VLLM_MODEL = os.environ.get("VLLM_MODEL", "meta-llama/Llama-3.2-3B-Instruct")
VLLM_API_KEY = os.environ.get("VLLM_API_KEY", "EMPTY")
VLLM_TIMEOUT = int(os.environ.get("VLLM_TIMEOUT", "120"))


class VLLMClient:
    def __init__(
        self,
        base_url: str = VLLM_BASE_URL,
        model: str = VLLM_MODEL,
        api_key: str = VLLM_API_KEY,
        timeout: int = VLLM_TIMEOUT,
    ):
        self.base_url = base_url.rstrip("/")
        self.model = model
        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }
        self.timeout = timeout

    @retry(
        retry=retry_if_exception_type((httpx.ConnectError, httpx.TimeoutException)),
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
    )
    def chat_completions(
        self,
        messages: List[Dict[str, str]],
        json_mode: bool = True,
        temperature: float = 0.1,
        max_tokens: int = 2048,
    ) -> Dict[str, Any]:
        """
        Send a chat completion request to vLLM.
        
        Args:
            messages: OpenAI-style message list
            json_mode: If True, uses vLLM's guided decoding (JSON)
            temperature: Sampling temperature
            max_tokens: Limit output length
            
        Returns:
            Parsed JSON response content
        """
        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }

        # vLLM/OpenAI-style guided decoding for JSON
        if json_mode:
            # vLLM supports 'response_format' since recent versions
            payload["response_format"] = {"type": "json_object"}

        logger.info(f"[vLLM] Requesting completions from {self.base_url} model={self.model}")
        
        try:
            with httpx.Client(timeout=self.timeout) as client:
                response = client.post(
                    f"{self.base_url}/chat/completions",
                    json=payload,
                    headers=self.headers,
                )
                response.raise_for_status()
                
                data = response.json()
                content = data["choices"][0]["message"]["content"]
                
                # Strip markdown if model ignored the JSON format instruction
                if "```json" in content:
                    content = re.sub(r"```json\s*|\s*```", "", content).strip()
                
                try:
                    return json.loads(content)
                except json.JSONDecodeError:
                    logger.error(f"[vLLM] Failed to parse JSON content: {content[:100]}...")
                    raise
                    
        except httpx.HTTPStatusError as e:
            logger.error(f"[vLLM] HTTP Error: {e.response.status_code} - {e.response.text}")
            raise
        except Exception as e:
            logger.error(f"[vLLM] Unexpected error: {e}")
            raise


def is_vllm_available() -> bool:
    """Check if the vLLM server is reachable."""
    try:
        with httpx.Client(timeout=2) as client:
            # Ping models endpoint
            r = client.get(f"{VLLM_BASE_URL}/models", headers={"Authorization": f"Bearer {VLLM_API_KEY}"})
            return r.status_code == 200
    except Exception:
        return False
