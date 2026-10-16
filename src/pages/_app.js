import '../styles/dashboard.css'
import '../styles/globals.css'
import '../styles/satoshi.css'
import { SessionContextProvider } from "helpers/authProvider";

function MyApp({ Component, pageProps }) {
  return (
    <SessionContextProvider initialSession={pageProps.initialSession}>
      <Component {...pageProps} />
    </SessionContextProvider>
  );
}
export default MyApp;
