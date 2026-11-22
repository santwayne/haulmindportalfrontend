import React, { useState } from 'react';
import { FaExclamationTriangle, FaTimes } from 'react-icons/fa';

interface ExpiringDoc {
  name: string;
  expiryDate: string;
  daysLeft: number;
  entity: string; // e.g. "Truck #T001" or "Driver John"
}

interface Props {
  documents: Array<{
    description?: string;
    documentType?: string;
    fileName?: string;
    title?: string;
    expiryDate?: string;
    ignoreExpiration?: boolean;
  }>;
  entityLabel: string; // e.g. "Truck T001" or "Driver John Smith"
}

export function getExpiringDocs(
  documents: Props['documents'],
  entityLabel: string
): ExpiringDoc[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const results: ExpiringDoc[] = [];
  for (const doc of documents) {
    if (doc.ignoreExpiration || !doc.expiryDate) continue;
    const expiry = new Date(doc.expiryDate);
    expiry.setHours(0, 0, 0, 0);
    const daysLeft = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (daysLeft <= 30) {
      results.push({
        name: doc.description || doc.documentType || doc.fileName || doc.title || 'Document',
        expiryDate: doc.expiryDate,
        daysLeft,
        entity: entityLabel
      });
    }
  }
  return results;
}

const ExpiryWarningBanner: React.FC<Props> = ({ documents, entityLabel }) => {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  const expiring = getExpiringDocs(documents, entityLabel);
  if (expiring.length === 0) return null;

  return (
    <div className="mb-4 bg-amber-900/20 border border-amber-500/40 rounded-lg p-3 flex items-start gap-3">
      <FaExclamationTriangle className="text-amber-400 mt-0.5 flex-shrink-0" size={16} />
      <div className="flex-1">
        <p className="text-sm font-semibold text-amber-300 mb-1">
          {expiring.length} document{expiring.length > 1 ? 's' : ''} expiring soon for {entityLabel}
        </p>
        <ul className="space-y-0.5">
          {expiring.map((d, i) => (
            <li key={i} className="text-xs text-amber-200">
              <span className="font-medium">{d.name}</span>
              {d.daysLeft < 0
                ? <span className="text-red-400 ml-2">EXPIRED {Math.abs(d.daysLeft)} days ago</span>
                : d.daysLeft === 0
                ? <span className="text-red-400 ml-2">Expires TODAY</span>
                : <span className="text-amber-300 ml-2">Expires in {d.daysLeft} day{d.daysLeft !== 1 ? 's' : ''} ({new Date(d.expiryDate).toLocaleDateString()})</span>
              }
            </li>
          ))}
        </ul>
      </div>
      <button onClick={() => setDismissed(true)} className="text-amber-400 hover:text-amber-200">
        <FaTimes size={14} />
      </button>
    </div>
  );
};

export default ExpiryWarningBanner;
