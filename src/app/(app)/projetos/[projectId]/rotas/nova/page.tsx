import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppRouteForm } from "@/components/app-routes/app-route-form";

export default async function NewAppRoutePage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-6 text-xl font-semibold tracking-tight">Nova rota</h1>
      <Card>
        <CardHeader>
          <CardTitle>Detalhes</CardTitle>
        </CardHeader>
        <CardContent>
          <AppRouteForm projectId={projectId} />
        </CardContent>
      </Card>
    </div>
  );
}
