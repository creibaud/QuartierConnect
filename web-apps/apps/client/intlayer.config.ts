import { Locales, type IntlayerConfig } from "intlayer";

const config: IntlayerConfig = {
    content: {
        contentDir: ["./src", "../../packages/auth/src"],
    },
    internationalization: {
        locales: [Locales.ENGLISH, Locales.FRENCH],
        defaultLocale: Locales.FRENCH,
    },
    routing: {
        mode: "prefix-no-default",
    },
};

export default config;
