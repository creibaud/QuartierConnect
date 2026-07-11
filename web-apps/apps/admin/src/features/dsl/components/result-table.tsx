import { cellValue } from "../lib/result-format";

export function ResultTable({ rows }: { rows: Record<string, unknown>[] }) {
    const columns = Array.from(
        rows.reduce((set, row) => {
            Object.keys(row).forEach((k) => set.add(k));
            return set;
        }, new Set<string>()),
    ).slice(0, 12);

    return (
        <div className="max-h-[28rem] overflow-auto rounded-lg border">
            <table className="w-full text-left text-xs">
                <thead className="bg-muted text-muted-foreground sticky top-0">
                    <tr>
                        {columns.map((c) => (
                            <th
                                key={c}
                                className="px-3 py-2 font-medium whitespace-nowrap"
                            >
                                {c}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, i) => (
                        <tr key={i} className="border-t">
                            {columns.map((c) => (
                                <td
                                    key={c}
                                    className="text-foreground max-w-[16rem] truncate px-3 py-2 font-mono"
                                    title={cellValue(row[c])}
                                >
                                    {cellValue(row[c])}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
