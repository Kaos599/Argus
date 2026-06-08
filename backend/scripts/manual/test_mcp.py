import asyncio
import sys
from argus.mcp.manager import McpManager

class MockProvider:
    async def get(self, t):
        return 'mongodb://localhost:27017'

async def main():
    mgr = McpManager(MockProvider())
    await mgr.start()
    try:
        await mgr.call_tool('test', 'mongodb_list_collections', {})
        print("SUCCESS")
    except Exception as e:
        print('EXC TYPE:', type(e), 'STR:', repr(str(e)))
        import traceback
        traceback.print_exc()
    await mgr.stop()

if __name__ == "__main__":
    asyncio.run(main())
