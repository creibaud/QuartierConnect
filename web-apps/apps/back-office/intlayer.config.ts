import { Locales, type IntlayerConfig } from "intlayer";

const config: IntlayerConfig = {
    internationalization: {
        locales: [Locales.ENGLISH, Locales.FRENCH],
        defaultLocale: Locales.FRENCH,
    },
    routing: {
        mode: "prefix-no-default",
    },
    editor: {
        enabled: true,
        applicationURL:
            process.env.INTLAYER_APPLICATION_URL || "http://localhost:3000",
    },
    build: {
        importMode: "static",
    },
    // ai: {
    //   /**
    //    * AI provider to use.
    //    * Options: 'openai', 'anthropic', 'mistral', 'deepseek', 'gemini', 'ollama', 'openrouter', 'alibaba', 'fireworks', 'groq', 'huggingface', 'bedrock', 'googlevertex', 'togetherai'
    //    */
    //   provider: 'openai',
    //   model: 'gpt-5-mini',
    //   apiKey: process.env.OPENAI_API_KEY,
    //   applicationContext: [''].join('\n'),
    // },
    compiler: {
        enabled: true,
        output: ({ fileName }) => `./${fileName}.content.ts`,
        saveComponents: false,
    },
};

export default config;
