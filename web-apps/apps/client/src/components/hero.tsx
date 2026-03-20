import { useIntlayer } from "react-intlayer";

export const Hero = () => {
    // Le hook connecte ton composant au dictionnaire
    const { title, description } = useIntlayer("hero");

    return (
        <section>
            {/* Ces zones seront maintenant encadrées en bleu dans l'éditeur */}
            <h1>{title}</h1>
            <p>{description}</p>
        </section>
    );
};
