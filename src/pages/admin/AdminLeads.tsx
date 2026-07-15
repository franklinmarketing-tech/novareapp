import { useNavigate, useSearchParams } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Mail, FileText, LayoutGrid } from "lucide-react";
import AdminTodosLeads from "@/pages/admin/AdminTodosLeads";
import AdminLeadsNewsletter from "@/pages/AdminLeadsNewsletter";
import AdminLeadsPdf from "@/pages/admin/AdminLeadsPdf";

const ABAS = ["todos", "newsletter", "pdf"];

export default function AdminLeads() {
  const [params, setParams] = useSearchParams();
  const req = params.get("tab") || "";
  const tab = ABAS.includes(req) ? req : "todos";

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Leads</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Todos os leads captados, de todas as origens, num lugar só.
        </p>
      </div>

      <Tabs
        value={tab}
        onValueChange={(v) => {
          const next = new URLSearchParams(params);
          next.set("tab", v);
          setParams(next, { replace: true });
        }}
      >
        <TabsList className="grid grid-cols-3 max-w-xl">
          <TabsTrigger value="todos" className="gap-2">
            <LayoutGrid className="w-4 h-4" /> Todos os leads
          </TabsTrigger>
          <TabsTrigger value="newsletter" className="gap-2">
            <Mail className="w-4 h-4" /> Newsletter
          </TabsTrigger>
          <TabsTrigger value="pdf" className="gap-2">
            <FileText className="w-4 h-4" /> PDF
          </TabsTrigger>
        </TabsList>

        <TabsContent value="todos" className="mt-4">
          <AdminTodosLeads />
        </TabsContent>
        <TabsContent value="newsletter" className="mt-4">
          <div className="-mx-4 md:-mx-8">
            <AdminLeadsNewsletter />
          </div>
        </TabsContent>
        <TabsContent value="pdf" className="mt-4">
          <div className="-mx-4 md:-mx-8">
            <AdminLeadsPdf />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
