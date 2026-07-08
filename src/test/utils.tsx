import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
}

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient;
}

function AllTheProviders({ children, queryClient }: { children: React.ReactNode; queryClient: QueryClient }) {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
}

function customRender(ui: ReactElement, options?: CustomRenderOptions) {
  const queryClient = options?.queryClient ?? createTestQueryClient();
  return {
    ...render(ui, { wrapper: ({ children }) => <AllTheProviders queryClient={queryClient}>{children}</AllTheProviders>, ...options }),
    queryClient,
  };
}

export * from '@testing-library/react';
export { customRender as render, createTestQueryClient };
