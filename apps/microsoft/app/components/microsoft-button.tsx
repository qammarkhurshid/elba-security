import { formatMicrosoftConsentUrl } from '#src/common/microsoft';
import MicrosoftLogo from './microsoft-logo';

function MicrosoftLoginButton() {
  return (
    <a
      href={formatMicrosoftConsentUrl()}
      role="button"
      className="bg-white text-gray-600 border-2 border-gray-600 rounded-md p-2 cursor-pointer flex items-center justify-center">
      <MicrosoftLogo size={24} />
      <span className="ml-5 px-16">Sign in with Microsoft</span>
    </a>
  );
}

export default MicrosoftLoginButton;
