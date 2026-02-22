import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def test_conn(url):
    print(f"Testing connection to {url}")
    engine = create_async_engine(url)
    try:
        async with engine.connect() as conn:
            result = await conn.execute(text("SELECT True"))
            print(f"Result: {result.fetchone()}")
            print("Connection successful!")
            return True
    except Exception as e:
        print(f"Connection failed: {e}")
        return False
    finally:
        await engine.dispose()

async def main():
    urls = [
        "postgresql+asyncpg://auditai:auditai_secret@127.0.0.1:55433/auditai",
        "postgresql+asyncpg://admin_test:admin_secret@127.0.0.1:55433/auditai"
    ]
    for url in urls:
        await test_conn(url)

if __name__ == "__main__":
    asyncio.run(main())
