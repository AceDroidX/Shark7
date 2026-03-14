import { ChatDeepSeek } from '@langchain/deepseek'
import { CallbackHandler } from '@langfuse/langchain'
import { createAgent, tool } from 'langchain'
import { initLogger, logger } from 'shark7-shared'
import { z } from 'zod'
import { initLangfuseOtel, shutdownLangfuseOtel } from '../src/langfuse.ts'

process.env['LANGCHAIN_CALLBACKS_BACKGROUND'] ??= 'false'

export async function main() {
    initLogger('shark7-ai-langfuse-test')

    if (!process.env['DEEPSEEK_API_KEY']) {
        logger.error('缺少 DEEPSEEK_API_KEY')
        process.exit(1)
    }

    if (!process.env['LANGFUSE_SECRET_KEY'] || !process.env['LANGFUSE_PUBLIC_KEY']) {
        logger.error('缺少 LANGFUSE_SECRET_KEY 或 LANGFUSE_PUBLIC_KEY')
        process.exit(1)
    }

    await initLangfuseOtel()

    const langfuseHandler = new CallbackHandler({
        sessionId: 'langfuse-smoke-test',
        userId: 'shark7-dev',
        tags: ['shark7-ai', 'langchain-test'],
    })

    const getWeather = tool(
        async ({ city }: { city: string }) => `It's always sunny in ${city}!`,
        {
            name: 'get_weather',
            description: 'Get the weather for a given city',
            schema: z.object({
                city: z.string().describe('The city to get the weather for'),
            }),
        },
    )

    const agent: any = createAgent({
        model: new ChatDeepSeek({
            apiKey: process.env['DEEPSEEK_API_KEY'],
            model: process.env['DEEPSEEK_MODEL'] ?? 'deepseek-chat',
            temperature: 0,
            maxTokens: 128,
        }),
        tools: [getWeather],
    } as any)

    logger.info('开始执行最小 Langfuse 冒烟测试')

    const result = await agent.invoke(
        { messages: [{ role: 'user', content: "What's the weather in San Francisco?" }] },
        {
            callbacks: [langfuseHandler],
            runName: 'langfuse-smoke-test',
            metadata: {
                langfuseSessionId: 'langfuse-smoke-test',
                langfuseUserId: 'shark7-dev',
                langfuseTags: ['shark7-ai', 'langchain-test'],
            } as Record<string, unknown>,
        } as any,
    ) as unknown

    logger.info('Langfuse 冒烟测试调用完成')
    console.log(JSON.stringify(result, null, 2))

    await shutdownLangfuseOtel()
}

if (import.meta.main) {
    main().catch(async (error) => {
        logger.error(`Langfuse 冒烟测试失败: ${error instanceof Error ? error.message : String(error)}`)
        await shutdownLangfuseOtel()
        process.exit(1)
    })
}
