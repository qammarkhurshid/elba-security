import { formatMicrosoftConsentUrl } from '@/common/microsoft';

export default function Home() {
  return <a href={formatMicrosoftConsentUrl()}>Connect elba to Microsoft</a>;
}
