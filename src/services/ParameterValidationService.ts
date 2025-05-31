// src/services/ParameterValidationService.ts
export class ParameterValidationService {
  private placeholderPatterns = [
    /^test/i,
    /^demo/i,
    /^sample/i,
    /^example/i,
    /^placeholder/i,
    /^temp/i,
    /^dummy/i,
    /^fake/i,
    /password123/i,
    /admin123/i,
    /changeme/i,
    /todo/i,
    /xxx/i,
    /\[.*\]/,  // Anything in brackets like [ServerName]
    /<.*>/,    // Anything in angle brackets like <username>
  ];

  private reservedNames = [
    'admin', 'root', 'test', 'demo', 'user', 'guest', 
    'default', 'system', 'administrator', 'superuser'
  ];

  constructor(private strictMode: boolean = true) {}

  validateConnectionString(connectionString: string, providerName?: string): { valid: boolean; error?: string } {
    if (!this.strictMode) return { valid: true };

    // Check for empty or too short
    if (!connectionString || connectionString.length < 10) {
      return { 
        valid: false, 
        error: "Connection string too short. Must contain actual connection details." 
      };
    }

    // Check for placeholder patterns
    for (const pattern of this.placeholderPatterns) {
      if (pattern.test(connectionString)) {
        return { 
          valid: false, 
          error: `Connection string appears to contain placeholder values (${pattern}). Please provide actual connection details.` 
        };
      }
    }

    // Provider-specific validation
    if (providerName) {
      if (providerName.toLowerCase().includes('sql') && !connectionString.toLowerCase().includes('server=')) {
        return { 
          valid: false, 
          error: "SQL connection string must include 'Server=' parameter" 
        };
      }
      
      if (providerName.toLowerCase().includes('salesforce') && !connectionString.includes('SecurityToken=')) {
        return { 
          valid: false, 
          error: "Salesforce connection string must include SecurityToken parameter" 
        };
      }
    }

    return { valid: true };
  }

  validateUsername(username: string, context: 'user' | 'connection' = 'user'): { valid: boolean; error?: string } {
    if (!this.strictMode) return { valid: true };

    // Check length
    if (username.length < 3 || username.length > 50) {
      return { 
        valid: false, 
        error: "Username must be 3-50 characters" 
      };
    }

    // Check pattern
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      return { 
        valid: false, 
        error: "Username can only contain letters, numbers, underscore, and hyphen" 
      };
    }

    // Check for reserved names in user context
    if (context === 'user' && this.reservedNames.includes(username.toLowerCase())) {
      return { 
        valid: false, 
        error: `Username '${username}' is reserved. Please choose a different username.` 
      };
    }

    // Check for placeholder patterns
    for (const pattern of this.placeholderPatterns) {
      if (pattern.test(username)) {
        return { 
          valid: false, 
          error: `Username appears to be a placeholder. Please provide an actual username.` 
        };
      }
    }

    return { valid: true };
  }

  validatePassword(password: string): { valid: boolean; error?: string } {
    if (!this.strictMode) return { valid: true };

    // Check minimum length
    if (password.length < 8) {
      return { 
        valid: false, 
        error: "Password must be at least 8 characters long" 
      };
    }

    // Check complexity requirements
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    
    if (!hasUpper || !hasLower || !hasNumber) {
      return { 
        valid: false, 
        error: "Password must contain at least one uppercase letter, one lowercase letter, and one number" 
      };
    }

    // Check for common weak passwords
    const weakPasswords = [
      'password123', 'admin123', 'changeme', 'welcome123', 
      'password1', 'qwerty123', '12345678', 'abcd1234'
    ];
    
    if (weakPasswords.includes(password.toLowerCase())) {
      return { 
        valid: false, 
        error: "Password is too common. Please choose a more secure password." 
      };
    }

    return { valid: true };
  }

  validateJobName(jobName: string): { valid: boolean; error?: string } {
    if (!this.strictMode) return { valid: true };

    // Check length
    if (jobName.length < 3 || jobName.length > 100) {
      return { 
        valid: false, 
        error: "Job name must be 3-100 characters" 
      };
    }

    // Check pattern
    if (!/^[a-zA-Z0-9_-]+$/.test(jobName)) {
      return { 
        valid: false, 
        error: "Job name can only contain letters, numbers, underscore, and hyphen" 
      };
    }

    // Check for placeholder patterns
    for (const pattern of this.placeholderPatterns) {
      if (pattern.test(jobName)) {
        return { 
          valid: false, 
          error: `Job name appears to be a placeholder. Please provide a meaningful job name that describes its purpose.` 
        };
      }
    }

    return { valid: true };
  }

  validateEmail(email: string): { valid: boolean; error?: string } {
    if (!this.strictMode) return { valid: true };

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    
    if (!emailRegex.test(email)) {
      return { 
        valid: false, 
        error: "Invalid email format" 
      };
    }

    // Check for placeholder domains
    const placeholderDomains = ['example.com', 'test.com', 'demo.com', 'temp.com'];
    const domain = email.split('@')[1].toLowerCase();
    
    if (placeholderDomains.includes(domain)) {
      return { 
        valid: false, 
        error: "Please use a real email address, not a placeholder domain" 
      };
    }

    return { valid: true };
  }

  validateCron(cron: string): { valid: boolean; error?: string } {
    if (!this.strictMode) return { valid: true };

    // Basic cron validation
    const cronParts = cron.split(' ');
    if (cronParts.length < 5 || cronParts.length > 7) {
      return { 
        valid: false, 
        error: "Invalid cron expression. Expected 5-7 space-separated values." 
      };
    }

    // Check for special expressions
    const specialExpressions = ['@yearly', '@annually', '@monthly', '@weekly', '@daily', '@hourly'];
    if (specialExpressions.includes(cron)) {
      return { valid: true };
    }

    return { valid: true };
  }

  validateQuery(query: string): { valid: boolean; error?: string } {
    if (!this.strictMode) return { valid: true };

    // Check minimum length
    if (query.length < 10) {
      return { 
        valid: false, 
        error: "Query too short. Please provide a complete SQL query." 
      };
    }

    // Check for placeholder patterns in queries
    const queryPlaceholders = [
      /select \* from table/i,
      /insert into table/i,
      /update table set/i,
      /your.?table/i,
      /table.?name/i,
      /\[table\]/i,
      /<table>/i
    ];

    for (const pattern of queryPlaceholders) {
      if (pattern.test(query)) {
        return { 
          valid: false, 
          error: "Query contains placeholder table names. Please specify actual table names." 
        };
      }
    }

    return { valid: true };
  }

  // General validation for any parameter
  validateParameter(
    value: any, 
    paramName: string
  ): { valid: boolean; error?: string } {
    if (!this.strictMode) return { valid: true };

    // Check for null/undefined in required fields
    if (value === null || value === undefined || value === '') {
      return { 
        valid: false, 
        error: `${paramName} is required and cannot be empty` 
      };
    }

    // String placeholder checks
    if (typeof value === 'string') {
      for (const pattern of this.placeholderPatterns) {
        if (pattern.test(value)) {
          return { 
            valid: false, 
            error: `${paramName} appears to contain placeholder text. Please provide actual values.` 
          };
        }
      }
    }

    return { valid: true };
  }
}