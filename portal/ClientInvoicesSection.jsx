import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { DollarSign, Download, Search, CreditCard, Calendar, CheckCircle, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";

export default function ClientInvoicesSection({ user }) {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: invoices = [], isLoading, error } = useQuery({
    queryKey: ['client-invoices', user?.email],
    queryFn: async () => {
      try {
        return await base44.entities.Invoice.filter({ client_email: user.email }, '-created_date');
      } catch (error) {
        console.error('Failed to fetch invoices:', error);
        throw error;
      }
    },
    enabled: !!user,
    retry: 3,
    retryDelay: 1000
  });

  if (error) {
    return (
      <Card className="p-8 text-center border-0 shadow-lg">
        <AlertTriangle className="w-12 h-12 text-orange-500 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-gray-900 mb-2">Unable to Load Invoices</h3>
        <p className="text-gray-600 mb-4">We're having trouble loading your invoices. Please try again.</p>
        <Button onClick={() => window.location.reload()}>Refresh Page</Button>
      </Card>
    );
  }

  const filteredInvoices = invoices.filter(inv =>
    inv.invoice_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    inv.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPaid = invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.total_amount, 0);
  const totalOwed = invoices.filter(i => ['sent', 'viewed', 'overdue'].includes(i.status)).reduce((sum, i) => sum + i.total_amount, 0);
  const overdueCount = invoices.filter(i => i.status === 'overdue').length;

  const statusColors = {
    draft: "bg-gray-100 text-gray-700",
    sent: "bg-blue-100 text-blue-700",
    viewed: "bg-cyan-100 text-cyan-700",
    paid: "bg-green-100 text-green-700",
    overdue: "bg-red-100 text-red-700"
  };

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white">
        <CardHeader>
          <CardTitle className="text-3xl">Invoices & Payments</CardTitle>
          <p className="text-purple-100">Manage your billing and payment history</p>
        </CardHeader>
      </Card>

      {/* Summary Cards */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="border-0 shadow-lg">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Paid</p>
                <p className="text-3xl font-bold text-green-600">${totalPaid.toFixed(2)}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Outstanding</p>
                <p className="text-3xl font-bold text-orange-600">${totalOwed.toFixed(2)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Overdue</p>
                <p className="text-3xl font-bold text-red-600">{overdueCount}</p>
              </div>
              <Calendar className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search invoices..."
          className="pl-10"
        />
      </div>

      {/* Invoice List */}
      <div className="space-y-3">
        {filteredInvoices.map(invoice => (
          <Card key={invoice.id} className="border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-bold text-gray-900">{invoice.invoice_number}</h3>
                    <Badge className={statusColors[invoice.status]}>{invoice.status}</Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{invoice.description}</p>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>Due: {format(new Date(invoice.due_date), 'MMM d, yyyy')}</span>
                    {invoice.paid_date && (
                      <span>Paid: {format(new Date(invoice.paid_date), 'MMM d, yyyy')}</span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-900">${invoice.total_amount.toFixed(2)}</p>
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" variant="outline">
                      <Download className="w-4 h-4 mr-1" />
                      Download
                    </Button>
                    {invoice.status !== 'paid' && (
                      <Button size="sm" className="bg-purple-600">
                        <CreditCard className="w-4 h-4 mr-1" />
                        Pay Now
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}