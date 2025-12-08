//+------------------------------------------------------------------+
//|                                                     TJP_Sync.mq5 |
//|                                  Copyright 2024, Trading Journal |
//|                                   https://app.tradingjournalpro.online |
//+------------------------------------------------------------------+
#property copyright "Trading Journal Pro"
#property link      "https://app.tradingjournalpro.online"
#property version   "1.00"
#property strict

// Inputs
input string InpWebhookUrl = "https://app.tradingjournalpro.online/api/webhooks/sync"; // Webhook URL
input string InpApiKey     = "PASTE_YOUR_KEY_HERE";                                    // Sync Key from Dashboard

// Global Variables
int lastHistoryOrders = 0;

//+------------------------------------------------------------------+
//| Expert initialization function                                   |
//+------------------------------------------------------------------+
int OnInit()
  {
   Print("TJP Sync: Initialized. Waiting for trades...");
   lastHistoryOrders = HistoryDealsTotal();
   
   // Enable WebRequest
   if(!TerminalInfoInteger(TERMINAL_DLLS_ALLOWED)) {
      Print("Warning: DLLs must be enabled for WebRequest.");
   }
   
   return(INIT_SUCCEEDED);
  }

//+------------------------------------------------------------------+
//| Expert tick function                                             |
//+------------------------------------------------------------------+
void OnTick()
  {
   // Only run when a new deal is added to history
   if (HistoryDealsTotal() > lastHistoryOrders) {
      int total = HistoryDealsTotal();
      
      // Check the new deals
      for (int i = lastHistoryOrders; i < total; i++) {
         ulong ticket = HistoryDealGetTicket(i);
         if (ticket > 0) {
            long type = HistoryDealGetInteger(ticket, DEAL_TYPE);
            
            // We care about Entry (In) and Exit (Out)
            // But for simplicity, we usually sync on EXIT to get the PnL
            long entry = HistoryDealGetInteger(ticket, DEAL_ENTRY);
            
            if (entry == DEAL_ENTRY_OUT || entry == DEAL_ENTRY_INOUT) {
               SendTradeToWebhook(ticket);
            }
         }
      }
      lastHistoryOrders = total;
   }
  }

//+------------------------------------------------------------------+
//| Send Data via HTTP POST                                          |
//+------------------------------------------------------------------+
void SendTradeToWebhook(ulong ticket) {
   string headers = "Content-Type: application/json\r\nAuthorization: " + InpApiKey + "\r\n";
   char data[];
   char result[];
   string resultHeaders;
   
   // Prepare JSON Payload
   string pair = HistoryDealGetString(ticket, DEAL_SYMBOL);
   double price = HistoryDealGetDouble(ticket, DEAL_PRICE);
   double volume = HistoryDealGetDouble(ticket, DEAL_VOLUME);
   double profit = HistoryDealGetDouble(ticket, DEAL_PROFIT);
   long time = HistoryDealGetInteger(ticket, DEAL_TIME);
   long type = HistoryDealGetInteger(ticket, DEAL_TYPE);
   
   string direction = (type == DEAL_TYPE_BUY) ? "LONG" : "SHORT";
   
   string json = StringFormat(
      "{\"ticket\": %d, \"pair\": \"%s\", \"direction\": \"%s\", \"price\": %.5f, \"size\": %.2f, \"pnl\": %.2f, \"timestamp\": %d}",
      ticket, pair, direction, price, volume, profit, time
   );
   
   StringToCharArray(json, data, 0, StringLen(json), CP_UTF8);
   
   // Send Request
   int res = WebRequest("POST", InpWebhookUrl, headers, 3000, data, result, resultHeaders);
   
   if (res == 200) {
      Print("TJP Sync: Trade sent successfully. Ticket: ", ticket);
   } else {
      Print("TJP Sync: Failed to send trade. Error: ", GetLastError(), " Status: ", res);
   }
}
