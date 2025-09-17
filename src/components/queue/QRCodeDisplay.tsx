import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { QrCode, Download, Share2 } from "lucide-react";

interface QRCodeDisplayProps {
  token: {
    id: string;
    token_number: number;
    qr_code?: string;
    citizen_name: string;
    time_slot: string;
    service_type: string;
  };
}

export const QRCodeDisplay = ({ token }: QRCodeDisplayProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const downloadQRCode = () => {
    if (token.qr_code) {
      const link = document.createElement('a');
      link.download = `token-${token.token_number}-qr.png`;
      link.href = token.qr_code;
      link.click();
    }
  };

  const shareToken = async () => {
    const tokenInfo = `Token #${token.token_number}\nName: ${token.citizen_name}\nTime: ${token.time_slot}\nService: ${token.service_type}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Queue Token #${token.token_number}`,
          text: tokenInfo,
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      // Fallback - copy to clipboard
      navigator.clipboard.writeText(tokenInfo);
    }
  };

  if (!token.qr_code) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <QrCode className="h-4 w-4" />
          QR Code
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Token QR Code - #{token.token_number}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex justify-center">
            <img 
              src={token.qr_code} 
              alt={`QR Code for token ${token.token_number}`}
              className="w-64 h-64 border rounded-lg"
            />
          </div>
          
          <Card className="p-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="font-medium">Token:</span>
                <span>#{token.token_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Name:</span>
                <span>{token.citizen_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Time:</span>
                <span>{token.time_slot}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Service:</span>
                <span className="capitalize">{token.service_type}</span>
              </div>
            </div>
          </Card>
          
          <div className="flex gap-2">
            <Button onClick={downloadQRCode} className="flex-1 gap-2">
              <Download className="h-4 w-4" />
              Download
            </Button>
            <Button variant="outline" onClick={shareToken} className="flex-1 gap-2">
              <Share2 className="h-4 w-4" />
              Share
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};