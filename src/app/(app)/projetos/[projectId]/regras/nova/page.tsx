import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RuleForm } from "@/components/rules/rule-form";

export default async function NewRulePage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-xl font-semibold tracking-tight">Nova regra</h1>
      <Card>
        <CardHeader>
          <CardTitle>Detalhes</CardTitle>
        </CardHeader>
        <CardContent>
          <RuleForm projectId={projectId} />
        </CardContent>
      </Card>
    </div>
  );
}
