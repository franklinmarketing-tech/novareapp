import { useNavigate, useSearchParams } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Mail, FileText } from "lucide-react";
import AdminLeadsNewsletter from "@/pages/AdminLeadsNewsletter";
import AdminLeadsPdf from "@/pages/admin/AdminLeadsPdf";

export default function AdminLeads() {
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") === "pdf" ? "pdf" : "newsletter";

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Leads</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Inscrições da newsletter e leads gerados pelo PDF da calculadora.
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
        <TabsList className="grid grid-cols-2 max-w-md">
          <TabsTrigger value="newsletter" className="gap-2">
            <Mail className="w-4 h-4" /> Newsletter
          </TabsTrigger>
          <TabsTrigger value="pdf" className="gap-2">
            <FileText className="w-4 h-4" /> PDF
          </TabsTrigger>
        </TabsList>

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
