// Ports (Interfaces)
export interface Port {
  // Base interface for all ports
}

// Primary Ports (Use Case interfaces)
export interface UseCase<TRequest, TResponse> {
  execute(request: TRequest): Promise<TResponse>;
}

// Secondary Ports (External dependencies)
export interface ExternalPort extends Port {
  // Base interface for external dependencies
}
