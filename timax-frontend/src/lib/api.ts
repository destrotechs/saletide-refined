import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  role: string;
  is_active: boolean;
  date_joined?: string;
  branch?: {
    id: string;
    name: string;
  };
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: User;
  expires_in: number;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  vehicles_count: number;
  total_jobs: number;
  total_spent: number;
  is_active: boolean;
  created_at: string;
}

export interface Vehicle {
  id: string;
  plate_number: string;
  make: string;
  model: string;
  year: number;
  color: string;
  vin?: string;
  notes?: string;
  customer: string;
  customer_name: string;
  customer_phone?: string;
  customer_email?: string;
  customer_address?: string;
  is_active: boolean;
  total_jobs?: number;
  total_spent?: number;
  last_service_date?: string;
  recent_jobs?: any[];
  created_at: string;
  updated_at: string;
}

export interface Job {
  id: string;
  job_number: string;
  customer: string;
  customer_name: string;
  customer_phone: string;
  vehicle: string;
  vehicle_display: string;
  status: 'DRAFT' | 'SCHEDULED' | 'IN_PROGRESS' | 'QC' | 'COMPLETED' | 'INVOICED' | 'PAID' | 'CLOSED';
  estimate_total: string;
  final_total: string;
  discount_amount: string;
  tax_amount: string;
  payments_total: number;
  balance_due: number;
  lines?: JobLine[];
  created_by: string;
  created_by_name: string;
  assigned_technician: string;
  technician_name: string;
  estimated_start_time?: string;
  estimated_completion_time?: string;
  actual_start_time?: string;
  actual_completion_time?: string;
  estimated_duration: number;
  notes?: string;
  internal_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface JobLineInventoryItem {
  id?: string;
  sku: string;
  sku_name: string;
  sku_code: string;
  quantity_used: string;
  unit_cost: string;
  total_cost: string;
}

export interface JobLine {
  id: string;
  service_variant: string;
  service_variant_name: string;
  service_name: string;
  part_name: string;
  quantity: string;
  unit_price: string;
  discount_percentage: string;
  discount_amount: string;
  total_amount: string;
  duration_minutes: number;
  notes?: string;
  inventory_items?: JobLineInventoryItem[];
  assigned_employees?: string[];
  assigned_employee_names?: string[];
  is_completed: boolean;
  completed_at?: string;
  is_below_floor: boolean;
  created_at: string;
  updated_at: string;
}

export interface DashboardStats {
  total_jobs: number;
  jobs_today: number;
  pending_jobs: number;
  completed_jobs: number;
  total_revenue: number;
  revenue_today: number;
  total_customers: number;
  active_customers: number;
  average_job_value: number;
  jobs_this_week: number;
  payments_today: number;
}

export interface AccountCategory {
  id: string;
  name: string;
  code: string;
  account_type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
  description: string;
  is_active: boolean;
  accounts: Account[];
  total_balance: number;
  created_at: string;
  updated_at: string;
}

export interface Account {
  id: string;
  name: string;
  code: string;
  account_type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
  account_subtype: string;
  balance: number;
  debit_balance: number;
  credit_balance: number;
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FinancialSummary {
  total_assets: number;
  total_liabilities: number;
  total_equity: number;
  cash_on_hand: number;
  accounts_receivable: number;
  accounts_payable: number;
  working_capital: number;
  quick_ratio: number;
  debt_to_equity_ratio: number;
}

export interface PLStatement {
  period: {
    start_date: string;
    end_date: string;
  };
  revenue: {
    service_revenue: number;
    parts_revenue: number;
    labor_revenue: number;
    total_revenue: number;
  };
  expenses: {
    cost_of_goods_sold: number;
    operating_expenses: number;
    administrative_expenses: number;
    total_expenses: number;
  };
  gross_profit: number;
  net_income: number;
  gross_margin: number;
  net_margin: number;
}

export interface InventoryOption {
  id: string;
  service_variant: string;
  sku: string;
  sku_name: string;
  sku_code: string;
  sku_unit: string;
  sku_cost: string;
  is_required: boolean;
  standard_quantity: string;
  floor_price_modifier: string;
}

// ServiceVariant interface moved to line 359 with complete type definition

export interface Invoice {
  id: string;
  invoice_number: string;
  job: string;
  job_number: string;
  customer_name: string;
  status: 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  issue_date: string;
  due_date: string;
  subtotal: string;
  tax_amount: string;
  discount_amount: string;
  total_amount: string;
  notes?: string;
  terms_and_conditions?: string;
  created_by: string;
  created_by_name: string;
  sent_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  job: string;
  amount: string;
  payment_method: 'CASH' | 'CARD' | 'MOBILE_MONEY' | 'BANK_TRANSFER' | 'CHEQUE' | 'CREDIT';
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
  reference_number?: string;
  notes?: string;
  processed_by: string;
  processed_by_name: string;
  created_at: string;
  updated_at: string;
}

export interface Receipt {
  id: string;
  receipt_number: string;
  job: string;
  job_number: string;
  customer_name: string;
  invoice?: string;
  invoice_number?: string;
  payment: string;
  amount_paid: string;
  payment_method: 'CASH' | 'CARD' | 'MOBILE_MONEY' | 'BANK_TRANSFER' | 'CHEQUE' | 'CREDIT';
  payment_reference?: string;
  notes?: string;
  issued_by: string;
  issued_by_name: string;
  issued_at: string;
}

export interface SKU {
  id: string;
  code: string;
  name: string;
  description: string;
  category: string;
  category_name: string;
  unit: string;
  cost: string;
  selling_price_per_unit?: string | null;
  min_stock_level: string;
  max_stock_level: string | null;
  reorder_point: string;
  lead_time_days: number;
  supplier: string;
  supplier_name: string;
  batch_tracked: boolean;
  current_stock: number;
  stock_value: number;
  reorder_status: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface VehicleClass {
  id: string;
  name: string;
  code: string;
  modifier_type: 'PERCENTAGE' | 'FIXED';
  modifier_value: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Part {
  id: string;
  name: string;
  parent?: string;
  parent_name?: string;
  code: string;
  description: string;
  is_active: boolean;
  children?: Part[];
  created_at: string;
  updated_at: string;
}

export interface Service {
  id: string;
  name: string;
  code: string;
  description: string;
  duration_estimate_minutes: number;
  is_active: boolean;
  variants?: ServiceVariant[];
  created_at: string;
  updated_at: string;
}

export interface ServiceVariantInventory {
  id: string;
  sku: string;
  sku_name: string;
  sku_code: string;
  sku_unit: string;
  sku_cost: string;
  is_required: boolean;
  standard_quantity: string;
  floor_price_modifier: string;
}

export interface ServiceVariant {
  id: string;
  service: string;
  service_name: string;
  part: string;
  part_name: string;
  vehicle_class: string;
  vehicle_class_name: string;
  suggested_price: string;
  floor_price: string;
  price_inputs: Record<string, any>;
  is_active: boolean;
  calculated_price: number;
  inventory_options: ServiceVariantInventory[];
  created_by?: string;
  created_by_name?: string;
  updated_by?: string;
  updated_by_name?: string;
  created_at: string;
  updated_at: string;
}

export interface PriceBand {
  id: string;
  service_variant: string;
  name: string;
  min_percentage: string;
  max_percentage: string;
  requires_approval: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  user?: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
  };
  action_type: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'APPROVE' | 'REJECT' | 'OVERRIDE' | 'STOCK_ADJUSTMENT' | 'PAYMENT' | 'EXPORT';
  model_name: string;
  object_id: string;
  object_repr: string;
  changes: Record<string, any>;
  ip_address?: string;
  user_agent: string;
  session_key: string;
  request_path: string;
  request_method: string;
  status_code?: number;
  additional_data: Record<string, any>;
  created_at: string;
}

export interface PriceOverrideLog {
  id: string;
  job_line: string;
  original_price: string;
  floor_price: string;
  requested_price: string;
  approved_price?: string;
  reason: string;
  requested_by?: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
  };
  approved_by?: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
  };
  is_approved?: boolean;
  approval_notes: string;
  requested_at: string;
  reviewed_at?: string;
}

export interface StockMovementLog {
  id: string;
  sku: {
    id: string;
    name: string;
    code: string;
  };
  location: {
    id: string;
    name: string;
  };
  movement_type: 'IN' | 'OUT' | 'ADJUSTMENT' | 'TRANSFER' | 'CONSUMPTION' | 'WASTAGE';
  quantity_before: string;
  quantity_change: string;
  quantity_after: string;
  cost_per_unit: string;
  total_value: string;
  reference_type: string;
  reference_id: string;
  reason: string;
  batch_number: string;
  expiry_date?: string;
  user?: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
  };
  approved_by?: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
  };
  created_at: string;
}

export interface UserSessionLog {
  id: string;
  user: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
  };
  session_key: string;
  ip_address: string;
  user_agent: string;
  login_time: string;
  logout_time?: string;
  last_activity: string;
  is_active: boolean;
  location: string;
  device_type: string;
}

export interface AssetCategory {
  id: string;
  name: string;
  code: string;
  description: string;
  useful_life_years: number;
  depreciation_method: string;
  asset_account: string;
  depreciation_account: string;
  expense_account: string;
  is_active: boolean;
  asset_count?: number;
  total_value?: string;
  created_at: string;
  updated_at: string;
}

export interface Asset {
  id: string;
  asset_number: string;
  name: string;
  description: string;
  category: string;
  category_name: string;
  category_code: string;
  purchase_cost: string;
  purchase_date: string;
  salvage_value: string;
  useful_life_years: number;
  depreciation_method: string;
  depreciation_method_display: string;
  accumulated_depreciation: string;
  current_book_value: string;
  last_depreciation_date: string | null;
  serial_number: string;
  model: string;
  manufacturer: string;
  location: string;
  condition: string;
  condition_display: string;
  status: string;
  status_display: string;
  assigned_to: string | null;
  assigned_to_name: string;
  department: string;
  disposal_date: string | null;
  disposal_amount: string | null;
  disposal_method: string;
  warranty_expiry: string | null;
  insurance_value: string | null;
  next_maintenance_date: string | null;
  notes: string;
  tags: string;
  created_by: string;
  created_by_name: string;
  created_at: string;
  updated_at: string;
  age_in_years: number;
  depreciation_rate: string;
  monthly_depreciation: string;
  annual_depreciation: string;
}

export interface AssetMaintenance {
  id: string;
  asset: string;
  asset_name?: string;
  maintenance_date: string;
  description: string;
  cost: number;
  performed_by: string;
  next_maintenance?: string;
  type: 'preventive' | 'corrective' | 'emergency' | 'routine';
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
}

export interface AssetTransfer {
  id: string;
  asset: string;
  asset_name?: string;
  from_location: string;
  to_location: string;
  from_user?: string;
  to_user?: string;
  transfer_date: string;
  reason: string;
  notes?: string;
  created_by: string;
  created_by_name?: string;
  created_at: string;
}

export interface EmployeeCommissionRate {
  id: string;
  employee: string;
  employee_name: string;
  employee_email: string;
  service_variant: string | null;
  service_variant_name: string;
  service_name: string;
  part_name: string;
  commission_percentage: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Commission {
  id: string;
  employee: string;
  employee_name: string;
  employee_email: string;
  job: string;
  job_number: string;
  customer_name: string;
  job_line: string;
  service_variant_name: string;
  service_name: string;
  commission_rate: string;
  service_amount: string;
  commission_amount: string;
  status: 'AVAILABLE' | 'PAYABLE' | 'PAID' | 'CANCELLED';
  status_display: string;
  paid_at: string | null;
  paid_by: string | null;
  paid_by_name: string;
  payment_reference: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface CommissionSummary {
  employee: string;
  employee_name: string;
  total_available: string;
  total_payable: string;
  total_paid: string;
  count_available: number;
  count_payable: number;
  count_paid: number;
}

export interface Tip {
  id: string;
  job: string;
  job_number: string;
  employee: string;
  employee_name: string;
  employee_email: string;
  amount: string;
  status: 'PENDING' | 'PAID' | 'CANCELLED';
  status_display: string;
  payment_method: string;
  payment_method_display: string;
  paid_at: string | null;
  paid_by: string | null;
  paid_by_name: string;
  recorded_by: string;
  recorded_by_name: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface AdvancePayment {
  id: string;
  employee: string;
  employee_name: string;
  employee_email: string;
  requested_amount: string;
  approved_amount: string;
  available_commission: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID' | 'CANCELLED';
  status_display: string;
  reason: string;
  reviewed_by: string | null;
  reviewed_by_name: string;
  reviewed_at: string | null;
  review_notes: string;
  payment_method: string;
  payment_method_display: string;
  paid_at: string | null;
  paid_by: string | null;
  paid_by_name: string;
  payment_reference: string;
  created_at: string;
  updated_at: string;
}

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('access_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor to handle token refresh and authentication errors
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const original = error.config;

        // Handle authentication errors (401 Unauthorized or 403 Forbidden with authentication_failed)
        const isAuthError = error.response?.status === 401 ||
          (error.response?.status === 403 &&
           error.response?.data?.error_code === 'authentication_failed');

        if (isAuthError && !original._retry) {
          original._retry = true;

          try {
            const refreshToken = localStorage.getItem('refresh_token');
            if (refreshToken && error.response?.status === 401) {
              // Only try to refresh for 401 errors, not 403 authentication_failed
              const response = await this.client.post('/auth/refresh/', {
                refresh_token: refreshToken,
              });

              const { access_token, refresh_token } = response.data;
              localStorage.setItem('access_token', access_token);
              localStorage.setItem('refresh_token', refresh_token);

              return this.client(original);
            } else {
              // No refresh token available or expired token (403), user needs to login
              throw new Error('Authentication failed - redirect to login required');
            }
          } catch (refreshError) {
            // Refresh failed or token expired, clear tokens and redirect to login
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');

            // Dispatch a custom event to notify the auth context
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('auth:logout', { detail: 'token_expired' }));
              // Force redirect to login
              window.location.href = '/login';
            }
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  // Auth methods
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await this.client.post('/auth/login/', credentials);
    return response.data;
  }

  async logout(): Promise<void> {
    const refreshToken = localStorage.getItem('refresh_token');
    if (refreshToken) {
      await this.client.post('/auth/logout/', { refresh: refreshToken });
    }
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  }

  async getCurrentUser(): Promise<User> {
    const response = await this.client.get('/auth/user/');
    return response.data;
  }

  async updateProfile(data: {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
  }): Promise<{ message: string; user: User }> {
    const response = await this.client.patch('/auth/update_profile/', data);
    return response.data;
  }

  async changePassword(data: {
    old_password: string;
    new_password: string;
    confirm_password: string;
  }): Promise<{ message: string }> {
    const response = await this.client.post('/auth/change_password/', data);
    return response.data;
  }

  async getUsers(params?: { role?: string; is_active?: boolean; page?: number }): Promise<{
    results: User[];
    count: number;
    next: string | null;
    previous: string | null;
  }> {
    const response = await this.client.get('/auth/users/', { params });
    return response.data;
  }

  async getUser(id: string): Promise<User> {
    const response = await this.client.get(`/auth/users/${id}/`);
    return response.data;
  }

  async createUser(data: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    phone?: string;
    role: string;
    branch?: string;
  }): Promise<User> {
    const response = await this.client.post('/auth/users/', data);
    return response.data;
  }

  async updateUser(id: string, data: Partial<User>): Promise<User> {
    const response = await this.client.patch(`/auth/users/${id}/`, data);
    return response.data;
  }

  async activateUser(id: string): Promise<{ message: string }> {
    const response = await this.client.post(`/auth/users/${id}/activate/`);
    return response.data;
  }

  async deactivateUser(id: string): Promise<{ message: string }> {
    const response = await this.client.post(`/auth/users/${id}/deactivate/`);
    return response.data;
  }

  async changeUserRole(id: string, role: string): Promise<{ message: string }> {
    const response = await this.client.post(`/auth/users/${id}/change_role/`, { role });
    return response.data;
  }

  // Dashboard methods
  async getDashboardStats(): Promise<DashboardStats> {
    const response = await this.client.get('/dashboard/stats/');
    return response.data;
  }

  // Customer methods
  async getCustomers(params?: { search?: string; page?: number }): Promise<{
    results: Customer[];
    count: number;
    next: string | null;
    previous: string | null;
  }> {
    const response = await this.client.get('/sales/customers/', { params });
    return response.data;
  }

  async getCustomer(id: string): Promise<Customer> {
    const response = await this.client.get(`/sales/customers/${id}/`);
    return response.data;
  }

  async createCustomer(data: Partial<Customer>): Promise<Customer> {
    const response = await this.client.post('/sales/customers/', data);
    return response.data;
  }

  async updateCustomer(id: string, data: Partial<Customer>): Promise<Customer> {
    const response = await this.client.patch(`/sales/customers/${id}/`, data);
    return response.data;
  }

  // Vehicle methods
  async getVehicles(params?: { customer?: string; search?: string }): Promise<Vehicle[]> {
    const response = await this.client.get('/sales/vehicles/', { params });
    return response.data.results || response.data;
  }

  async createVehicle(data: Partial<Vehicle>): Promise<Vehicle> {
    const response = await this.client.post('/sales/vehicles/', data);
    return response.data;
  }

  async getVehicle(id: string): Promise<Vehicle> {
    const response = await this.client.get(`/sales/vehicles/${id}/`);
    return response.data;
  }

  async updateVehicle(id: string, data: Partial<Vehicle>): Promise<Vehicle> {
    const response = await this.client.patch(`/sales/vehicles/${id}/`, data);
    return response.data;
  }

  async getVehicleServiceHistory(id: string): Promise<{
    vehicle: {
      id: string;
      plate_number: string;
      make_model: string;
    };
    service_history: Array<{
      job_id: string;
      job_number: string;
      date: string;
      status: string;
      total_amount: number;
      services: string[];
    }>;
    total_jobs: number;
    total_spent: number;
  }> {
    const response = await this.client.get(`/sales/vehicles/${id}/service_history/`);
    return response.data;
  }

  // Job methods
  async getJobs(params?: {
    status?: string;
    priority?: string;
    customer?: string;
    employee?: string;
    search?: string;
    page?: number;
  }): Promise<Job[]> {
    const response = await this.client.get('/sales/jobs/', { params });
    return response.data.results || response.data;
  }

  async getJob(id: string): Promise<Job> {
    const response = await this.client.get(`/sales/jobs/${id}/`);
    return response.data;
  }

  async createJob(data: Partial<Job>): Promise<Job> {
    const response = await this.client.post('/sales/jobs/', data);
    return response.data;
  }

  async updateJob(id: string, data: Partial<Job>): Promise<Job> {
    const response = await this.client.patch(`/sales/jobs/${id}/`, data);
    return response.data;
  }

  async completeJob(id: string): Promise<{ message: string }> {
    const response = await this.client.post(`/sales/jobs/${id}/complete/`);
    return response.data;
  }

  // Invoice methods
  async getInvoices(params?: { search?: string; status?: string; page?: number }): Promise<{
    results: Invoice[];
    count: number;
    next: string | null;
    previous: string | null;
  }> {
    const response = await this.client.get('/sales/invoices/', { params });
    return response.data;
  }

  async getInvoice(id: string): Promise<Invoice> {
    const response = await this.client.get(`/sales/invoices/${id}/`);
    return response.data;
  }

  async generateInvoiceFromJob(jobId: string): Promise<Invoice> {
    const response = await this.client.post(`/sales/invoices/${jobId}/generate_from_job/`);
    return response.data;
  }

  async sendInvoice(id: string): Promise<Invoice> {
    const response = await this.client.post(`/sales/invoices/${id}/send_invoice/`);
    return response.data;
  }

  // Payment methods
  async getPayments(params?: { search?: string; job?: string; page?: number }): Promise<{
    results: Payment[];
    count: number;
    next: string | null;
    previous: string | null;
  }> {
    const response = await this.client.get('/sales/payments/', { params });
    return response.data;
  }

  async getPayment(id: string): Promise<Payment> {
    const response = await this.client.get(`/sales/payments/${id}/`);
    return response.data;
  }

  async createPayment(data: Partial<Payment>): Promise<Payment> {
    const response = await this.client.post('/sales/payments/', data);
    return response.data;
  }

  // Receipt methods
  async getReceipts(params?: { search?: string; job?: string; page?: number }): Promise<{
    results: Receipt[];
    count: number;
    next: string | null;
    previous: string | null;
  }> {
    const response = await this.client.get('/sales/receipts/', { params });
    return response.data;
  }

  async getReceipt(id: string): Promise<Receipt> {
    const response = await this.client.get(`/sales/receipts/${id}/`);
    return response.data;
  }

  async generateReceiptFromPayment(paymentId: string): Promise<Receipt> {
    const response = await this.client.post('/sales/receipts/generate_from_payment/', {
      payment_id: paymentId
    });
    return response.data;
  }

  // Inventory methods
  async getSKUs(params?: { search?: string; category?: string; page?: number }): Promise<{
    results: SKU[];
    count: number;
    next: string | null;
    previous: string | null;
  }> {
    const response = await this.client.get('/inventory/skus/', { params });
    return response.data;
  }

  async getSKU(id: string): Promise<SKU> {
    const response = await this.client.get(`/inventory/skus/${id}/`);
    return response.data;
  }

  // Analytics methods
  async getAnalyticsDashboard(params?: {
    period?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<any> {
    const response = await this.client.get('/analytics/dashboard/', { params });
    return response.data;
  }

  async getSalesChart(params?: {
    period?: string;
    interval?: string;
  }): Promise<any> {
    const response = await this.client.get('/analytics/sales_chart/', { params });
    return response.data;
  }

  async getAnalyticsInsights(): Promise<any> {
    const response = await this.client.get('/analytics/insights/');
    return response.data;
  }

  // Services management methods
  async getServices(params?: { search?: string; is_active?: boolean; page?: number }): Promise<{
    results: Service[];
    count: number;
    next: string | null;
    previous: string | null;
  }> {
    const response = await this.client.get('/services/services/', { params });
    return response.data;
  }

  async getService(id: string): Promise<Service> {
    const response = await this.client.get(`/services/services/${id}/`);
    return response.data;
  }

  async createService(data: Partial<Service>): Promise<Service> {
    const response = await this.client.post('/services/services/', data);
    return response.data;
  }

  async updateService(id: string, data: Partial<Service>): Promise<Service> {
    const response = await this.client.patch(`/services/services/${id}/`, data);
    return response.data;
  }

  async deleteService(id: string): Promise<void> {
    await this.client.delete(`/services/services/${id}/`);
  }

  async getServiceCatalog(): Promise<Service[]> {
    const response = await this.client.get('/services/services/catalog/');
    return response.data;
  }

  async getServiceStatistics(): Promise<any> {
    const response = await this.client.get('/services/services/statistics/');
    return response.data;
  }

  // Service Variants methods
  async getServiceVariants(params?: {
    search?: string;
    service?: string;
    part?: string;
    vehicle_class?: string;
    is_active?: boolean;
    page?: number
  }): Promise<{
    results: ServiceVariant[];
    count: number;
    next: string | null;
    previous: string | null;
  }> {
    const response = await this.client.get('/services/service-variants/', { params });
    return response.data;
  }

  async getServiceVariant(id: string): Promise<ServiceVariant> {
    const response = await this.client.get(`/services/service-variants/${id}/`);
    return response.data;
  }

  async createServiceVariant(data: Partial<ServiceVariant>): Promise<ServiceVariant> {
    const response = await this.client.post('/services/service-variants/', data);
    return response.data;
  }

  async updateServiceVariant(id: string, data: Partial<ServiceVariant>): Promise<ServiceVariant> {
    const response = await this.client.patch(`/services/service-variants/${id}/`, data);
    return response.data;
  }

  async deleteServiceVariant(id: string): Promise<void> {
    await this.client.delete(`/services/service-variants/${id}/`);
  }

  async checkServicePricing(data: {
    service_variant: string;
    proposed_price: number;
  }): Promise<any> {
    const response = await this.client.post('/services/service-variants/check_pricing/', data);
    return response.data;
  }

  async calculateServicePricing(data: {
    service: string;
    part: string;
    vehicle_class: string;
    custom_price?: number;
  }): Promise<any> {
    const response = await this.client.post('/services/service-variants/calculate_pricing/', data);
    return response.data;
  }

  async getServiceVariantPricingRecommendations(id: string): Promise<any> {
    const response = await this.client.get(`/services/service-variants/${id}/pricing_recommendations/`);
    return response.data;
  }

  // Vehicle Classes methods
  async getVehicleClasses(params?: { search?: string; is_active?: boolean; page?: number }): Promise<{
    results: VehicleClass[];
    count: number;
    next: string | null;
    previous: string | null;
  }> {
    const response = await this.client.get('/services/vehicle-classes/', { params });
    return response.data;
  }

  async getVehicleClass(id: string): Promise<VehicleClass> {
    const response = await this.client.get(`/services/vehicle-classes/${id}/`);
    return response.data;
  }

  async createVehicleClass(data: Partial<VehicleClass>): Promise<VehicleClass> {
    const response = await this.client.post('/services/vehicle-classes/', data);
    return response.data;
  }

  async updateVehicleClass(id: string, data: Partial<VehicleClass>): Promise<VehicleClass> {
    const response = await this.client.patch(`/services/vehicle-classes/${id}/`, data);
    return response.data;
  }

  async deleteVehicleClass(id: string): Promise<void> {
    await this.client.delete(`/services/vehicle-classes/${id}/`);
  }

  async getVehicleClassStatistics(): Promise<any> {
    const response = await this.client.get('/services/vehicle-classes/statistics/');
    return response.data;
  }

  // Parts methods
  async getParts(params?: { search?: string; parent?: string; is_active?: boolean; page?: number }): Promise<{
    results: Part[];
    count: number;
    next: string | null;
    previous: string | null;
  }> {
    const response = await this.client.get('/services/parts/', { params });
    return response.data;
  }

  async getPart(id: string): Promise<Part> {
    const response = await this.client.get(`/services/parts/${id}/`);
    return response.data;
  }

  async createPart(data: Partial<Part>): Promise<Part> {
    const response = await this.client.post('/services/parts/', data);
    return response.data;
  }

  async updatePart(id: string, data: Partial<Part>): Promise<Part> {
    const response = await this.client.patch(`/services/parts/${id}/`, data);
    return response.data;
  }

  async deletePart(id: string): Promise<void> {
    await this.client.delete(`/services/parts/${id}/`);
  }

  async getPartsTree(): Promise<Part[]> {
    const response = await this.client.get('/services/parts/tree/');
    return response.data;
  }

  async getPartChildren(id: string): Promise<Part[]> {
    const response = await this.client.get(`/services/parts/${id}/children/`);
    return response.data;
  }

  // Price Bands methods
  async getPriceBands(params?: { service_variant?: string; page?: number }): Promise<{
    results: PriceBand[];
    count: number;
    next: string | null;
    previous: string | null;
  }> {
    const response = await this.client.get('/services/price-bands/', { params });
    return response.data;
  }

  async getPriceBand(id: string): Promise<PriceBand> {
    const response = await this.client.get(`/services/price-bands/${id}/`);
    return response.data;
  }

  async createPriceBand(data: Partial<PriceBand>): Promise<PriceBand> {
    const response = await this.client.post('/services/price-bands/', data);
    return response.data;
  }

  async updatePriceBand(id: string, data: Partial<PriceBand>): Promise<PriceBand> {
    const response = await this.client.patch(`/services/price-bands/${id}/`, data);
    return response.data;
  }

  async deletePriceBand(id: string): Promise<void> {
    await this.client.delete(`/services/price-bands/${id}/`);
  }

  async testPriceBand(id: string, price: number): Promise<any> {
    const response = await this.client.post(`/services/price-bands/${id}/test_price/`, { price });
    return response.data;
  }

  // Audit methods
  async getAuditLogs(params?: {
    search?: string;
    action_type?: string;
    model_name?: string;
    user?: string;
    start_date?: string;
    end_date?: string;
    page?: number;
  }): Promise<{
    results: AuditLog[];
    count: number;
    next: string | null;
    previous: string | null;
  }> {
    const response = await this.client.get('/audit/audit-logs/', { params });
    return response.data;
  }

  async getAuditLog(id: string): Promise<AuditLog> {
    const response = await this.client.get(`/audit/audit-logs/${id}/`);
    return response.data;
  }

  async getPriceOverrideLogs(params?: {
    search?: string;
    is_approved?: boolean;
    requested_by?: string;
    approved_by?: string;
    page?: number;
  }): Promise<{
    results: PriceOverrideLog[];
    count: number;
    next: string | null;
    previous: string | null;
  }> {
    const response = await this.client.get('/audit/price-override-logs/', { params });
    return response.data;
  }

  async getPriceOverrideLog(id: string): Promise<PriceOverrideLog> {
    const response = await this.client.get(`/audit/price-override-logs/${id}/`);
    return response.data;
  }

  async getStockMovementLogs(params?: {
    search?: string;
    movement_type?: string;
    sku?: string;
    location?: string;
    user?: string;
    start_date?: string;
    end_date?: string;
    page?: number;
  }): Promise<{
    results: StockMovementLog[];
    count: number;
    next: string | null;
    previous: string | null;
  }> {
    const response = await this.client.get('/audit/stock-movement-logs/', { params });
    return response.data;
  }

  async getStockMovementLog(id: string): Promise<StockMovementLog> {
    const response = await this.client.get(`/audit/stock-movement-logs/${id}/`);
    return response.data;
  }

  async getUserSessionLogs(params?: {
    search?: string;
    user?: string;
    is_active?: boolean;
    start_date?: string;
    end_date?: string;
    page?: number;
  }): Promise<{
    results: UserSessionLog[];
    count: number;
    next: string | null;
    previous: string | null;
  }> {
    const response = await this.client.get('/audit/session-logs/', { params });
    return response.data;
  }

  async getUserSessionLog(id: string): Promise<UserSessionLog> {
    const response = await this.client.get(`/audit/session-logs/${id}/`);
    return response.data;
  }

  async getAuditStatistics(): Promise<any> {
    const response = await this.client.get('/audit/audit-logs/statistics/');
    return response.data;
  }

  // Asset Management methods
  async getAssets(params?: {
    search?: string;
    status?: string;
    category?: string;
    assigned_to?: string;
    depreciation_status?: string;
    page?: number;
  }): Promise<Asset[]> {
    const response = await this.client.get('/assets/assets/', { params });
    return response.data.results || response.data;
  }

  async getAsset(id: string): Promise<Asset> {
    const response = await this.client.get(`/assets/assets/${id}/`);
    return response.data;
  }

  async createAsset(data: Partial<Asset>): Promise<Asset> {
    const response = await this.client.post('/assets/assets/', data);
    return response.data;
  }

  async updateAsset(id: string, data: Partial<Asset>): Promise<Asset> {
    const response = await this.client.patch(`/assets/assets/${id}/`, data);
    return response.data;
  }

  async deleteAsset(id: string): Promise<void> {
    await this.client.delete(`/assets/assets/${id}/`);
  }

  async getAssetSummary(): Promise<any> {
    const response = await this.client.get('/assets/assets/summary/');
    return response.data;
  }

  async calculateAssetDepreciation(id: string): Promise<any> {
    const response = await this.client.post(`/assets/assets/${id}/calculate_depreciation/`);
    return response.data;
  }

  async transferAsset(id: string, transferData: {
    to_location: string;
    to_user?: string;
    reason: string;
    notes?: string;
    transfer_date?: string;
  }): Promise<any> {
    const response = await this.client.post(`/assets/assets/${id}/transfer/`, transferData);
    return response.data;
  }

  async exportAssetsCSV(params?: any): Promise<Blob> {
    const response = await this.client.get('/assets/assets/export_csv/', {
      params,
      responseType: 'blob'
    });
    return response.data;
  }

  async getAssetCategories(params?: {
    search?: string;
    is_active?: boolean;
    page?: number;
  }): Promise<AssetCategory[]> {
    const response = await this.client.get('/assets/categories/', { params });
    return response.data.results || response.data;
  }

  async getAssetCategory(id: string): Promise<AssetCategory> {
    const response = await this.client.get(`/assets/categories/${id}/`);
    return response.data;
  }

  async createAssetCategory(data: Partial<AssetCategory>): Promise<AssetCategory> {
    const response = await this.client.post('/assets/categories/', data);
    return response.data;
  }

  async updateAssetCategory(id: string, data: Partial<AssetCategory>): Promise<AssetCategory> {
    const response = await this.client.patch(`/assets/categories/${id}/`, data);
    return response.data;
  }

  async deleteAssetCategory(id: string): Promise<void> {
    await this.client.delete(`/assets/categories/${id}/`);
  }

  async getAssetCategoryStatistics(id: string): Promise<any> {
    const response = await this.client.get(`/assets/categories/${id}/statistics/`);
    return response.data;
  }

  async getAssetMaintenance(params?: {
    asset?: string;
    type?: string;
    page?: number;
  }): Promise<any[]> {
    const response = await this.client.get('/assets/maintenance/', { params });
    return response.data.results || response.data;
  }

  async createAssetMaintenance(data: any): Promise<any> {
    const response = await this.client.post('/assets/maintenance/', data);
    return response.data;
  }

  async getAssetTransfers(params?: {
    asset?: string;
    page?: number;
  }): Promise<any[]> {
    const response = await this.client.get('/assets/transfers/', { params });
    return response.data.results || response.data;
  }

  async getDepreciationReport(params?: {
    year?: number;
    month?: number;
  }): Promise<any> {
    const response = await this.client.get('/assets/assets/depreciation_report/', { params });
    return response.data;
  }

  // Accounting methods
  async getChartOfAccounts(): Promise<AccountCategory[]> {
    const response = await this.client.get('/accounting/reports/chart_of_accounts/');
    return response.data;
  }

  async getFinancialSummary(): Promise<FinancialSummary> {
    const response = await this.client.get('/accounting/reports/financial_summary/');
    return response.data;
  }

  async getProfitLossStatement(params?: { start_date?: string; end_date?: string }): Promise<PLStatement> {
    const response = await this.client.get('/accounting/reports/profit_loss/', { params });
    return response.data;
  }

  async getAccountCategories(params?: { account_type?: string }): Promise<{
    results: AccountCategory[];
    count: number;
    next: string | null;
    previous: string | null;
  }> {
    const response = await this.client.get('/accounting/categories/', { params });
    return response.data;
  }

  async getAccounts(params?: { account_type?: string; category?: string }): Promise<{
    results: Account[];
    count: number;
    next: string | null;
    previous: string | null;
  }> {
    const response = await this.client.get('/accounting/accounts/', { params });
    return response.data;
  }

  // Commission methods
  async getCommissionRates(params?: {
    employee?: string;
    service_variant?: string;
    is_active?: boolean;
    page?: number;
  }): Promise<{
    results: EmployeeCommissionRate[];
    count: number;
    next: string | null;
    previous: string | null;
  }> {
    const response = await this.client.get('/sales/commission-rates/', { params });
    return response.data;
  }

  async getCommissionRate(id: string): Promise<EmployeeCommissionRate> {
    const response = await this.client.get(`/sales/commission-rates/${id}/`);
    return response.data;
  }

  async createCommissionRate(data: Partial<EmployeeCommissionRate>): Promise<EmployeeCommissionRate> {
    const response = await this.client.post('/sales/commission-rates/', data);
    return response.data;
  }

  async updateCommissionRate(id: string, data: Partial<EmployeeCommissionRate>): Promise<EmployeeCommissionRate> {
    const response = await this.client.patch(`/sales/commission-rates/${id}/`, data);
    return response.data;
  }

  async deleteCommissionRate(id: string): Promise<void> {
    await this.client.delete(`/sales/commission-rates/${id}/`);
  }

  async getCommissionRatesByEmployee(employeeId: string): Promise<EmployeeCommissionRate[]> {
    const response = await this.client.get('/sales/commission-rates/by_employee/', {
      params: { employee_id: employeeId }
    });
    return response.data;
  }

  async getCommissionRateForService(employeeId: string, serviceVariantId?: string): Promise<{
    commission_percentage: number;
    rate_type: 'service_specific' | 'default' | 'none';
    rate_id: string | null;
  }> {
    const response = await this.client.get('/sales/commission-rates/get_rate/', {
      params: { employee_id: employeeId, service_variant_id: serviceVariantId }
    });
    return response.data;
  }

  async getCommissions(params?: {
    employee?: string;
    job?: string;
    status?: string;
    page?: number;
  }): Promise<{
    results: Commission[];
    count: number;
    next: string | null;
    previous: string | null;
  }> {
    const response = await this.client.get('/sales/commissions/', { params });
    return response.data;
  }

  async getCommission(id: string): Promise<Commission> {
    const response = await this.client.get(`/sales/commissions/${id}/`);
    return response.data;
  }

  async updateCommission(id: string, data: Partial<Commission>): Promise<Commission> {
    const response = await this.client.patch(`/sales/commissions/${id}/`, data);
    return response.data;
  }

  async getCommissionsByEmployee(employeeId: string, status?: string): Promise<Commission[]> {
    const response = await this.client.get('/sales/commissions/by_employee/', {
      params: { employee_id: employeeId, status }
    });
    return response.data;
  }

  async getCommissionSummary(params?: { start_date?: string; end_date?: string }): Promise<CommissionSummary[]> {
    const response = await this.client.get('/sales/commissions/summary/', { params });
    return response.data;
  }

  async markCommissionsPayable(commissionIds: string[]): Promise<{
    message: string;
    updated_count: number;
  }> {
    const response = await this.client.post('/sales/commissions/mark_payable/', {
      commission_ids: commissionIds
    });
    return response.data;
  }

  async markCommissionsPaid(commissionIds: string[], paymentReference?: string): Promise<{
    message: string;
    updated_count: number;
  }> {
    const response = await this.client.post('/sales/commissions/mark_paid/', {
      commission_ids: commissionIds,
      payment_reference: paymentReference || ''
    });
    return response.data;
  }

  // Tip methods
  async getTips(params?: {
    employee?: string;
    job?: string;
    status?: string;
    page?: number;
  }): Promise<{
    results: Tip[];
    count: number;
    next: string | null;
    previous: string | null;
  }> {
    const response = await this.client.get('/sales/tips/', { params });
    return response.data;
  }

  async getTip(id: string): Promise<Tip> {
    const response = await this.client.get(`/sales/tips/${id}/`);
    return response.data;
  }

  async createTip(data: {
    job: string;
    employee: string;
    amount: string | number;
    notes?: string;
  }): Promise<Tip> {
    const response = await this.client.post('/sales/tips/', data);
    return response.data;
  }

  async updateTip(id: string, data: Partial<Tip>): Promise<Tip> {
    const response = await this.client.patch(`/sales/tips/${id}/`, data);
    return response.data;
  }

  async markTipPaid(id: string, paymentMethod: string, paymentReference?: string): Promise<Tip> {
    const response = await this.client.post(`/sales/tips/${id}/mark_paid/`, {
      payment_method: paymentMethod,
      payment_reference: paymentReference || ''
    });
    return response.data;
  }

  async cancelTip(id: string): Promise<Tip> {
    const response = await this.client.post(`/sales/tips/${id}/cancel/`);
    return response.data;
  }

  async getTipsByEmployee(employeeId: string, status?: string): Promise<Tip[]> {
    const response = await this.client.get('/sales/tips/by_employee/', {
      params: { employee_id: employeeId, status }
    });
    return response.data;
  }

  async getTipsStatistics(params?: { start_date?: string; end_date?: string }): Promise<{
    total_tips: string;
    total_pending: string;
    total_paid: string;
    total_cancelled: string;
    count_pending: number;
    count_paid: number;
    count_cancelled: number;
    by_employee: Array<{
      employee_id: string;
      employee_name: string;
      total_tips: string;
      count_tips: number;
    }>;
  }> {
    const response = await this.client.get('/sales/tips/statistics/', { params });
    return response.data;
  }

  // Advance Payment methods
  async getAdvancePayments(params?: {
    employee?: string;
    status?: string;
    page?: number;
  }): Promise<{
    results: AdvancePayment[];
    count: number;
    next: string | null;
    previous: string | null;
  }> {
    const response = await this.client.get('/sales/advance-payments/', { params });
    return response.data;
  }

  async getAdvancePayment(id: string): Promise<AdvancePayment> {
    const response = await this.client.get(`/sales/advance-payments/${id}/`);
    return response.data;
  }

  async createAdvancePayment(data: {
    employee?: string;
    requested_amount: string | number;
    reason: string;
  }): Promise<AdvancePayment> {
    const response = await this.client.post('/sales/advance-payments/', data);
    return response.data;
  }

  async updateAdvancePayment(id: string, data: {
    requested_amount?: string | number;
    reason?: string;
  }): Promise<AdvancePayment> {
    const response = await this.client.patch(`/sales/advance-payments/${id}/`, data);
    return response.data;
  }

  async reviewAdvancePayment(id: string, action: 'approve' | 'reject', approvedAmount?: string | number, reviewNotes?: string): Promise<AdvancePayment> {
    const response = await this.client.post(`/sales/advance-payments/${id}/review/`, {
      action,
      approved_amount: approvedAmount,
      review_notes: reviewNotes || ''
    });
    return response.data;
  }

  async markAdvancePaymentPaid(id: string, paymentMethod: string, paymentReference?: string): Promise<AdvancePayment> {
    const response = await this.client.post(`/sales/advance-payments/${id}/mark_paid/`, {
      payment_method: paymentMethod,
      payment_reference: paymentReference || ''
    });
    return response.data;
  }

  async giveAdvanceDirectly(data: {
    employee: string;
    requested_amount: string | number;
    reason: string;
    payment_method?: string;
    payment_reference?: string;
  }): Promise<AdvancePayment> {
    const response = await this.client.post('/sales/advance-payments/give_advance/', data);
    return response.data;
  }

  async cancelAdvancePayment(id: string): Promise<AdvancePayment> {
    const response = await this.client.post(`/sales/advance-payments/${id}/cancel/`);
    return response.data;
  }

  async getAdvancePaymentsByEmployee(employeeId: string, status?: string): Promise<AdvancePayment[]> {
    const response = await this.client.get('/sales/advance-payments/by_employee/', {
      params: { employee_id: employeeId, status }
    });
    return response.data;
  }

  async getAdvancePaymentsStatistics(params?: { start_date?: string; end_date?: string }): Promise<{
    total_requested: string;
    total_approved: string;
    total_paid: string;
    count_pending: number;
    count_approved: number;
    count_rejected: number;
    count_paid: number;
    by_employee: Array<{
      employee_id: string;
      employee_name: string;
      total_requested: string;
      total_approved: string;
      count_requests: number;
    }>;
  }> {
    const response = await this.client.get('/sales/advance-payments/statistics/', { params });
    return response.data;
  }

  // Reports methods
  async getFinancialReportPDF(params: { start_date: string; end_date: string }): Promise<Blob> {
    const response = await this.client.get('/reports/financial/generate_pdf/', {
      params,
      responseType: 'blob'
    });
    return response.data;
  }

  // Generic CRUD methods
  async get<T>(endpoint: string, params?: any): Promise<T> {
    const response = await this.client.get(endpoint, { params });
    return response.data;
  }

  async post<T>(endpoint: string, data: any): Promise<T> {
    const response = await this.client.post(endpoint, data);
    return response.data;
  }

  async patch<T>(endpoint: string, data: any): Promise<T> {
    const response = await this.client.patch(endpoint, data);
    return response.data;
  }

  async delete(endpoint: string): Promise<void> {
    await this.client.delete(endpoint);
  }
}

export const apiClient = new ApiClient();
export default apiClient;