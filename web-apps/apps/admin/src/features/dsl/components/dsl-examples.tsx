import { Button } from "@workspace/ui/components/button";
import { DSL_EXAMPLES } from "../lib/dsl-examples";

export function DslExamples({ onSelect }: { onSelect: (query: string) => void }) {
    return (
        <div className="flex flex-wrap gap-2">
            {DSL_EXAMPLES.map((example) => (
                <Button
                    key={example}
                    variant="outline"
                    size="sm"
                    onClick={() => onSelect(example)}
                    className="font-mono text-xs"
                >
                    {example.length > 40 ? `${example.slice(0, 40)}…` : example}
                </Button>
            ))}
        </div>
    );
}
