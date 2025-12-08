using System;
using System.Linq;
using cAlgo.API;
using cAlgo.API.Internals;
using System.Net.Http;
using System.Text;
using System.Text.Json; // Native JSON or simple string builder

namespace cAlgo.Robots
{
    [Robot(TimeZone = TimeZones.UTC, AccessRights = AccessRights.FullAccess)]
    public class TJPSync : Robot
    {
        [Parameter("Webhook URL", DefaultValue = "https://app.tradingjournalpro.online/api/webhooks/sync")]
        public string WebhookUrl { get; set; }

        [Parameter("Sync Key", DefaultValue = "PASTE_YOUR_KEY_HERE")]
        public string SyncKey { get; set; }

        private HttpClient _client;

        protected override void OnStart()
        {
            _client = new HttpClient();
            // Subscribe to position closed events
            Positions.Closed += OnPositionClosed;
            Print("TJP Sync: cBot Started.");
        }

        private void OnPositionClosed(PositionClosedEventArgs obj)
        {
            var pos = obj.Position;
            var direction = pos.TradeType == TradeType.Buy ? "LONG" : "SHORT";
            
            // Build simple JSON manually to avoid dependencies
            var json = $@"{{
                ""id"": ""{pos.Id}"", 
                ""pair"": ""{pos.SymbolName}"", 
                ""direction"": ""{direction}"", 
                ""entry_price"": {pos.EntryPrice}, 
                ""exit_price"": {pos.ClosingPrice}, 
                ""size"": {pos.VolumeInUnits}, 
                ""pnl"": {pos.NetProfit}, 
                ""timestamp"": {new DateTimeOffset(pos.EntryTime).ToUnixTimeSeconds()} 
            }}";

            SendData(json);
        }

        private async void SendData(string jsonPayload)
        {
            try
            {
                var request = new HttpRequestMessage(HttpMethod.Post, WebhookUrl);
                request.Headers.Add("Authorization", SyncKey);
                request.Content = new StringContent(jsonPayload, Encoding.UTF8, "application/json");

                var response = await _client.SendAsync(request);
                
                if (response.IsSuccessStatusCode)
                    Print("TJP Sync: Trade synced successfully.");
                else
                    Print($"TJP Sync: Failed. Status: {response.StatusCode}");
            }
            catch (Exception ex)
            {
                Print($"TJP Sync: Error - {ex.Message}");
            }
        }

        protected override void OnStop()
        {
            // Clean up
        }
    }
}
