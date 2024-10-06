export class ProductRetailer {
  name: string;
  logo: string;
  domain: string;
  linkToSearch: string;

  constructor(data: any) {
    this.name = data.name || "";
    this.logo = data.logo || "";
    this.domain = data.domain || "";
    this.linkToSearch = data.linkToSearch || "";
  }

  // Method to log the retailer information (placeholder for additional logic)
  logInfo(): void {
    console.log(`Retailer: ${this.name}, Domain: ${this.domain}`);
  }
}
