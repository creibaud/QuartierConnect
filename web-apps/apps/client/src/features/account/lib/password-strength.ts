import { ZxcvbnFactory } from "@zxcvbn-ts/core";
import * as zxcvbnCommonPackage from "@zxcvbn-ts/language-common";
import * as zxcvbnFrPackage from "@zxcvbn-ts/language-fr";

const zxcvbnInstance = new ZxcvbnFactory({
    dictionary: {
        ...zxcvbnCommonPackage.dictionary,
        ...zxcvbnFrPackage.dictionary,
    },
    graphs: zxcvbnCommonPackage.adjacencyGraphs,
    translations: zxcvbnFrPackage.translations,
});

export interface PasswordStrength {
    score: number;
    labelKey: string;
    barClass: string;
    textClass: string;
    warning: string;
}

const STRENGTH_LEVELS = [
    {
        labelKey: "pages.account.strengthVeryWeak",
        barClass: "bg-destructive",
        textClass: "text-destructive",
    },
    {
        labelKey: "pages.account.strengthWeak",
        barClass: "bg-orange-500",
        textClass: "text-orange-600",
    },
    {
        labelKey: "pages.account.strengthFair",
        barClass: "bg-yellow-500",
        textClass: "text-yellow-600",
    },
    {
        labelKey: "pages.account.strengthGood",
        barClass: "bg-lime-600",
        textClass: "text-lime-700",
    },
    {
        labelKey: "pages.account.strengthStrong",
        barClass: "bg-emerald-500",
        textClass: "text-emerald-600",
    },
];

/** Real strength estimation via zxcvbn (entropy, dictionaries, patterns). */
export function getPasswordStrength(password: string): PasswordStrength {
    const result = zxcvbnInstance.check(password);
    return {
        score: result.score,
        ...STRENGTH_LEVELS[result.score],
        warning: result.feedback.warning ?? "",
    };
}
