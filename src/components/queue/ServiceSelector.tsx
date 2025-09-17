import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface ServiceSelectorProps {
  value: string;
  onValueChange: (value: string) => void;
}

export const ServiceSelector = ({ value, onValueChange }: ServiceSelectorProps) => {
  const services = [
    { value: "license_renewal", label: "License Renewal" },
    { value: "new_license", label: "New License" },
    { value: "vehicle_registration", label: "Vehicle Registration" },
    { value: "permit_application", label: "Permit Application" },
    { value: "documents_verification", label: "Documents Verification" },
    { value: "general", label: "General Inquiry" }
  ];

  return (
    <div className="space-y-2">
      <Label htmlFor="service-type">Service Type</Label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger id="service-type">
          <SelectValue placeholder="Select a service" />
        </SelectTrigger>
        <SelectContent>
          {services.map((service) => (
            <SelectItem key={service.value} value={service.value}>
              {service.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};