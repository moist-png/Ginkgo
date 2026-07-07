export interface XeroQuote {
  Type: 'ACCREC';
  Contact: {
    Name: string;
    EmailAddress?: string;
    Phones?: Array<{
      PhoneType: 'MOBILE' | 'DEFAULT';
      PhoneNumber: string;
    }>;
    Addresses?: Array<{
      AddressType: 'STREET' | 'POBOX';
      AddressLine1: string;
      City?: string;
      Region?: string;
      PostalCode?: string;
      Country?: string;
    }>;
  };
  Date: string;
  DueDate: string;
  LineItems: Array<{
    Description: string;
    Quantity: number;
    UnitAmount: number;
    AccountCode?: string;
  }>;
  Reference?: string;
  Status: 'DRAFT' | 'SUBMITTED' | 'AUTHORISED';
}

export interface XeroConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
  tenantId?: string;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiry?: number;
}

class XeroIntegration {
  private config: XeroConfig;
  private baseUrl = 'https://api.xero.com/api.xro/2.0';

  constructor(config: XeroConfig) {
    this.config = config;
  }

  // OAuth 2.0 Authorization URL
  getAuthorizationUrl(): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      scope: this.config.scopes.join(' '),
      state: Math.random().toString(36).substring(7)
    });

    return `https://login.xero.com/identity/connect/authorize?${params.toString()}`;
  }

  // Exchange authorization code for tokens
  async exchangeCodeForTokens(code: string): Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
  }> {
    try {
      const response = await fetch('https://identity.xero.com/connect/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${btoa(`${this.config.clientId}:${this.config.clientSecret}`)}`
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: code,
          redirect_uri: this.config.redirectUri
        })
      });

      if (!response.ok) {
        throw new Error(`Token exchange failed: ${response.statusText}`);
      }

      const tokens = await response.json();
      
      // Store tokens
      this.config.accessToken = tokens.access_token;
      this.config.refreshToken = tokens.refresh_token;
      this.config.tokenExpiry = Date.now() + (tokens.expires_in * 1000);
      
      // Save to localStorage
      localStorage.setItem('xero-config', JSON.stringify(this.config));
      
      return tokens;
    } catch (error) {
      throw new Error(`Failed to exchange code for tokens: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Refresh access token
  async refreshAccessToken(): Promise<void> {
    if (!this.config.refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await fetch('https://identity.xero.com/connect/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${btoa(`${this.config.clientId}:${this.config.clientSecret}`)}`
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: this.config.refreshToken
        })
      });

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.statusText}`);
      }

      const tokens = await response.json();
      
      this.config.accessToken = tokens.access_token;
      this.config.refreshToken = tokens.refresh_token;
      this.config.tokenExpiry = Date.now() + (tokens.expires_in * 1000);
      
      localStorage.setItem('xero-config', JSON.stringify(this.config));
    } catch (error) {
      throw new Error(`Failed to refresh token: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Check if token needs refresh
  private async ensureValidToken(): Promise<void> {
    if (!this.config.accessToken) {
      throw new Error('No access token available. Please authorize first.');
    }

    if (this.config.tokenExpiry && Date.now() >= this.config.tokenExpiry - 60000) {
      await this.refreshAccessToken();
    }
  }

  // Get tenant connections
  async getTenants(): Promise<Array<{ tenantId: string; tenantName: string; tenantType: string }>> {
    await this.ensureValidToken();

    try {
      const response = await fetch('https://api.xero.com/connections', {
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to get tenants: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      throw new Error(`Failed to get tenants: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Create quote in Xero
  async createQuote(quote: XeroQuote): Promise<any> {
    await this.ensureValidToken();

    if (!this.config.tenantId) {
      throw new Error('No tenant selected. Please select a Xero organization first.');
    }

    try {
      const response = await fetch(`${this.baseUrl}/Quotes`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
          'Xero-tenant-id': this.config.tenantId,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ Quotes: [quote] })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create quote: ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      return result.Quotes[0];
    } catch (error) {
      throw new Error(`Failed to create quote in Xero: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Create invoice from quote
  async createInvoiceFromQuote(quoteId: string): Promise<any> {
    await this.ensureValidToken();

    if (!this.config.tenantId) {
      throw new Error('No tenant selected. Please select a Xero organization first.');
    }

    try {
      // First get the quote
      const quoteResponse = await fetch(`${this.baseUrl}/Quotes/${quoteId}`, {
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
          'Xero-tenant-id': this.config.tenantId,
          'Accept': 'application/json'
        }
      });

      if (!quoteResponse.ok) {
        throw new Error(`Failed to get quote: ${quoteResponse.statusText}`);
      }

      const quoteData = await quoteResponse.json();
      const quote = quoteData.Quotes[0];

      // Create invoice from quote data
      const invoice = {
        Type: 'ACCREC',
        Contact: quote.Contact,
        Date: new Date().toISOString().split('T')[0],
        DueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
        LineItems: quote.LineItems,
        Reference: `Quote: ${quote.QuoteNumber}`,
        Status: 'DRAFT'
      };

      const response = await fetch(`${this.baseUrl}/Invoices`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
          'Xero-tenant-id': this.config.tenantId,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ Invoices: [invoice] })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create invoice: ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      return result.Invoices[0];
    } catch (error) {
      throw new Error(`Failed to create invoice from quote: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Set tenant ID
  setTenantId(tenantId: string): void {
    this.config.tenantId = tenantId;
    localStorage.setItem('xero-config', JSON.stringify(this.config));
  }

  // Check if authenticated
  isAuthenticated(): boolean {
    return !!(this.config.accessToken && this.config.tenantId);
  }

  // Get current config
  getConfig(): XeroConfig {
    return { ...this.config };
  }
}

// Singleton instance
let xeroInstance: XeroIntegration | null = null;

export const getXeroInstance = (): XeroIntegration => {
  if (!xeroInstance) {
    // Load config from localStorage
    const savedConfig = localStorage.getItem('xero-config');
    const config: XeroConfig = savedConfig ? JSON.parse(savedConfig) : {
      clientId: '',
      clientSecret: '',
      redirectUri: `${window.location.origin}/xero-callback`,
      scopes: ['accounting.transactions', 'accounting.contacts']
    };
    
    xeroInstance = new XeroIntegration(config);
  }
  return xeroInstance;
};

// Convert app quote to Xero format
export const convertQuoteToXero = (quote: any, defaultUnitAmount: number = 100): XeroQuote => {
  return {
    Type: 'ACCREC',
    Contact: {
      Name: quote.clientName || 'Unknown Client',
      EmailAddress: quote.email || undefined,
      Phones: quote.mobile ? [{
        PhoneType: 'MOBILE',
        PhoneNumber: quote.mobile
      }] : undefined,
      Addresses: quote.address ? [{
        AddressType: 'STREET',
        AddressLine1: quote.address
      }] : undefined
    },
    Date: quote.scheduledDate,
    DueDate: new Date(new Date(quote.scheduledDate).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    LineItems: quote.jobDescription.map((item: any, index: number) => ({
      Description: item.description || `Service ${index + 1}`,
      Quantity: 1,
      UnitAmount: defaultUnitAmount,
      AccountCode: '200' // Default sales account - should be configurable
    })),
    Reference: `Quote-${quote.id}`,
    Status: 'DRAFT'
  };
};