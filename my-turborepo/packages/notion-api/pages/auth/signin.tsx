// pages/auth/signin.tsx
import { signIn } from 'next-auth/react';

export default function SignIn() {
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const token = formData.get('token') as string;

    await signIn('notion', { token, redirect: false });
  };

  return (
    <form onSubmit={handleSubmit}>
      <label>
        Notion Token:
        <input type="text" name="token" required />
      </label>
      <button type="submit">Sign in with Notion</button>
    </form>
  );
}
