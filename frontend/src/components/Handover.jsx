import { useState } from "react";
import { Check, Copy } from "lucide-react";
import toast from "react-hot-toast";
import Button from "./ui/Button";
import { ROLE_LABEL, fullName } from "./admin/labels";

/** Login details to hand over after creating an account. Shown once. */
function Handover({ account, onAnother, children }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(
        `Username: ${account.username}\nPassword: ${account.password}`,
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Couldn't copy. Select the details manually.");
    }
  };

  return (
    <div role="status">
      <p className="flex items-center gap-2 font-semibold">
        <Check size={18} className="text-success" aria-hidden="true" />
        {fullName(account)} can now sign in
      </p>
      <p className="mt-1 text-sm text-ink-secondary">
        {ROLE_LABEL[account.role]} account created. Pass these details on. The
        password is not stored anywhere you can read it again.
      </p>

      <dl className="mt-5 rounded-lg bg-night p-4 text-white">
        <dt className="text-sm text-white/60">Username</dt>
        <dd className="mt-0.5 font-mono text-[0.9375rem] break-all">
          {account.username}
        </dd>
        <dt className="mt-4 text-sm text-white/60">Password</dt>
        <dd className="mt-0.5 font-mono text-[0.9375rem] break-all">
          {account.password}
        </dd>
      </dl>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="secondary" onClick={copy}>
          {copied ? <Check size={16} /> : <Copy size={16} />}
          {copied ? "Copied" : "Copy details"}
        </Button>
        {children}
        <Button variant="ghost" onClick={onAnother}>
          Add another
        </Button>
      </div>
    </div>
  );
}

export default Handover;
