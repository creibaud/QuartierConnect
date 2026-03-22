import { t, type Dictionary } from "intlayer";

const authContent = {
    key: "auth",
    content: {
        login: {
            title: t({ en: "Sign in", fr: "Se connecter" }),
            description: t({
                en: "Enter your credentials to access your account",
                fr: "Entrez vos identifiants pour accéder à votre compte",
            }),
            emailLabel: t({ en: "Email", fr: "Email" }),
            emailPlaceholder: t({
                en: "john@example.com",
                fr: "jean@exemple.com",
            }),
            passwordLabel: t({ en: "Password", fr: "Mot de passe" }),
            passwordPlaceholder: t({ en: "••••••••", fr: "••••••••" }),
            submit: t({ en: "Sign in", fr: "Se connecter" }),
            submitting: t({ en: "Signing in...", fr: "Connexion en cours..." }),
            noAccount: t({
                en: "No account yet?",
                fr: "Pas encore de compte ?",
            }),
            register: t({ en: "Sign up", fr: "S'inscrire" }),
            serverError: t({
                en: "An error occurred",
                fr: "Une erreur est survenue",
            }),
        },
        register: {
            title: t({ en: "Create an account", fr: "Créer un compte" }),
            description: t({
                en: "Join QuartierConnect now",
                fr: "Rejoignez QuartierConnect dès maintenant",
            }),
            firstNameLabel: t({ en: "First name", fr: "Prénom" }),
            firstNamePlaceholder: t({ en: "John", fr: "Jean" }),
            lastNameLabel: t({ en: "Last name", fr: "Nom" }),
            lastNamePlaceholder: t({ en: "Doe", fr: "Dupont" }),
            emailLabel: t({ en: "Email", fr: "Email" }),
            emailPlaceholder: t({
                en: "john.doe@example.com",
                fr: "jean.dupont@exemple.com",
            }),
            passwordLabel: t({ en: "Password", fr: "Mot de passe" }),
            passwordPlaceholder: t({ en: "••••••••", fr: "••••••••" }),
            submit: t({ en: "Create account", fr: "Créer mon compte" }),
            submitting: t({
                en: "Creating account...",
                fr: "Inscription en cours...",
            }),
            alreadyHaveAccount: t({
                en: "Already have an account?",
                fr: "Déjà un compte ?",
            }),
            login: t({ en: "Sign in", fr: "Se connecter" }),
            serverError: t({
                en: "An error occurred",
                fr: "Une erreur est survenue",
            }),
        },
        totp: {
            title: t({ en: "2FA Verification", fr: "Vérification 2FA" }),
            description: t({
                en: "Enter the 6-digit code from your authenticator app",
                fr: "Entrez le code à 6 chiffres de votre application d'authentification",
            }),
            codeLabel: t({ en: "TOTP Code", fr: "Code TOTP" }),
            submit: t({ en: "Verify", fr: "Vérifier" }),
            submitting: t({ en: "Verifying...", fr: "Vérification..." }),
            backToLogin: t({
                en: "Back to sign in",
                fr: "Retour à la connexion",
            }),
            serverError: t({
                en: "Invalid code, please try again",
                fr: "Code invalide, veuillez réessayer",
            }),
        },
        validation: {
            emailInvalid: t({ en: "Invalid email address", fr: "Adresse email invalide" }),
            passwordRequired: t({ en: "Password is required", fr: "Mot de passe requis" }),
            passwordMinLength: t({ en: "At least 8 characters", fr: "Au moins 8 caractères" }),
            passwordUppercase: t({ en: "At least one uppercase letter", fr: "Au moins une majuscule" }),
            passwordLowercase: t({ en: "At least one lowercase letter", fr: "Au moins une minuscule" }),
            passwordDigit: t({ en: "At least one digit", fr: "Au moins un chiffre" }),
            passwordSpecial: t({
                en: "At least one special character (@$!%*?&)",
                fr: "Au moins un caractère spécial (@$!%*?&)",
            }),
            nameMinLength: t({ en: "At least 2 characters", fr: "Au moins 2 caractères" }),
            codeRequired: t({ en: "Code is required", fr: "Code requis" }),
        },
    },
} satisfies Dictionary;

export default authContent;
