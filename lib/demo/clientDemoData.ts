export const clientDemoData = {
  isDemo: true,
  client: { name: "Demo Client", whatsappMasked: null, timezone: "Asia/Kolkata" },
  greeting: "Welcome, Demo Client",
  invoice: {
    invoiceId: "WX-DEMO-1001", orderId: "DEMO-ORDER-1001", serviceType: "Dissertation Review", subject: "Research Methods",
    academicLevel: "Postgraduate", wordCount: 8000, deadline: "Demo Date", orderStatus: "QA Review", deliveryStatus: "QA Review"
  },
  work: {
    currentStage: "QA Review", progressPercent: 66,
    stages: [
      { key: "brief", label: "Brief Received", status: "complete" },
      { key: "scope", label: "Scope Reviewed", status: "complete" },
      { key: "expert", label: "Expert Assigned", status: "complete" },
      { key: "progress", label: "Work in Progress", status: "complete" },
      { key: "qa", label: "QA Review", status: "active" },
      { key: "preview", label: "Preview Ready", status: "pending" },
      { key: "payment", label: "Payment Pending", status: "pending" },
      { key: "download", label: "Download Locked", status: "blocked" }
    ]
  },
  payment: { paymentStatus: "Partially Paid", isSettled: false, canUnlockDownload: false, totalAmount: 24000, paidAmount: 12000, balanceAmount: 12000, currency: "INR" },
  paymentProof: null,
  delivery: { previewAvailable: true, finalAvailable: false, downloadUnlocked: false },
  support: { whatsappUrl: "", email: "Demo support disabled", supportHours: "Demo mode" },
  revisions: []
} as const;
