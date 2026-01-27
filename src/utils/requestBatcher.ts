/**
 * Request Batching Utility
 * Groups multiple API requests into a single batch request
 */

interface PendingRequest {
  resolve: (value: any) => void;
  reject: (error: any) => void;
  url: string;
  config?: any;
}

class RequestBatcher {
  private pendingRequests: Map<string, PendingRequest[]> = new Map();
  private batchDelay = 50; // Wait 50ms to collect requests
  private batchSize = 10; // Max requests per batch

  /**
   * Add request to batch
   */
  async add<T>(
    url: string,
    requestFn: (url: string, config?: any) => Promise<T>,
    config?: any
  ): Promise<T> {
    const batchKey = this.getBatchKey(url);

    return new Promise<T>((resolve, reject) => {
      if (!this.pendingRequests.has(batchKey)) {
        this.pendingRequests.set(batchKey, []);
        
        // Schedule batch execution
        setTimeout(() => {
          this.executeBatch(batchKey, requestFn);
        }, this.batchDelay);
      }

      const requests = this.pendingRequests.get(batchKey)!;
      requests.push({ resolve, reject, url, config });

      // Execute if batch is full
      if (requests.length >= this.batchSize) {
        this.executeBatch(batchKey, requestFn);
      }
    });
  }

  private getBatchKey(url: string): string {
    // Group by base path (e.g., /api/patients)
    const match = url.match(/^[^?]+/);
    return match ? match[0] : url;
  }

  private async executeBatch<T>(
    batchKey: string,
    requestFn: (url: string, config?: any) => Promise<T>
  ): Promise<void> {
    const requests = this.pendingRequests.get(batchKey);
    if (!requests || requests.length === 0) {
      this.pendingRequests.delete(batchKey);
      return;
    }

    // Remove from pending
    this.pendingRequests.delete(batchKey);

    // Execute all requests in parallel
    const promises = requests.map(({ url, config }) => requestFn(url, config));

    try {
      const results = await Promise.allSettled(promises);
      
      results.forEach((result, index) => {
        const { resolve, reject } = requests[index];
        if (result.status === 'fulfilled') {
          resolve(result.value);
        } else {
          reject(result.reason);
        }
      });
    } catch (error) {
      // If batch fails, reject all
      requests.forEach(({ reject }) => reject(error));
    }
  }
}

export const requestBatcher = new RequestBatcher();
