// The rotation engine lives in the shared domain package (the API reuses it
// at the provider-proxy layer); this bridge keeps existing client imports.
export { pickProfile } from '@nova/shared'
