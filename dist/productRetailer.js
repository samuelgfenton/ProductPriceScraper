"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductRetailer = void 0;
class ProductRetailer {
    constructor(data) {
        this.name = data.name || "";
        this.logo = data.logo || "";
        this.domain = data.domain || "";
        this.linkToSearch = data.linkToSearch || "";
    }
    // Method to log the retailer information (placeholder for additional logic)
    logInfo() {
        console.log(`Retailer: ${this.name}, Domain: ${this.domain}`);
    }
}
exports.ProductRetailer = ProductRetailer;
