import { t, type Dictionary } from "intlayer";

const heroContent = {
    key: "hero",
    content: {
        title: t({
            en: "Welcome to my App",
            fr: "Bienvenue sur mon App",
        }),
        description: t({
            en: "Start editing to see magic happen!",
            fr: "Commencez à éditer pour voir la magie opérer !",
        }),
    },
} satisfies Dictionary;

export default heroContent;
