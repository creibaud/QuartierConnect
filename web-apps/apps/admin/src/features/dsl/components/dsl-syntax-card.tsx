import { useTranslation } from "react-i18next";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@workspace/ui/components/card";

export function DslSyntaxCard() {
    const { t } = useTranslation();

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="text-base">
                    {t("adminPages.dsl.syntaxTitle")}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
                    <div>
                        <p className="mb-2 font-medium">
                            {t("adminPages.dsl.availableCollections")}
                        </p>
                        <ul className="text-muted-foreground space-y-1 font-mono text-xs">
                            <li>incidents</li>
                            <li>services</li>
                            <li>events</li>
                            <li>neighborhoods</li>
                            <li>users</li>
                        </ul>
                    </div>
                    <div>
                        <p className="mb-2 font-medium">
                            {t("adminPages.dsl.syntaxLabel")}
                        </p>
                        <ul className="text-muted-foreground space-y-1 font-mono text-xs">
                            <li>FIND &lt;collection&gt;</li>
                            <li>WHERE &lt;field&gt; = "&lt;value&gt;"</li>
                            <li>AND / OR</li>
                            <li>LIMIT &lt;n&gt;</li>
                            <li>COUNT &lt;collection&gt;</li>
                        </ul>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
