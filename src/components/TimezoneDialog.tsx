import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { updateTimezone } from '@/lib/auth';

// Build a comprehensive timezone list with ordering rules:
// 1) America/* on top (alphabetical)
// 2) Europe/* next (alphabetical)
// 3) Asia/Kolkata (India)
// 4) The rest (alphabetical)
function getAllTimezones(): string[] {
  try {
    const anyIntl = Intl as any;
    if (typeof anyIntl?.supportedValuesOf === 'function') {
      const vals = anyIntl.supportedValuesOf('timeZone');
      if (Array.isArray(vals) && vals.length > 0) return vals as string[];
    }
  } catch {}
  // Fallback list if supportedValuesOf isn't available
  return [
    'UTC',
    // Americas
    'America/Adak','America/Anchorage','America/Argentina/Buenos_Aires','America/Bogota','America/Boise','America/Chicago',
    'America/Denver','America/Detroit','America/Halifax','America/Hermosillo','America/Indiana/Indianapolis','America/Los_Angeles',
    'America/Mexico_City','America/New_York','America/Phoenix','America/Sao_Paulo','America/Tegucigalpa','America/Tijuana','America/Toronto',
    // Europe
    'Europe/Amsterdam','Europe/Athens','Europe/Belgrade','Europe/Berlin','Europe/Brussels','Europe/Budapest','Europe/Copenhagen','Europe/Dublin',
    'Europe/Helsinki','Europe/Istanbul','Europe/Kiev','Europe/Lisbon','Europe/London','Europe/Madrid','Europe/Oslo','Europe/Paris','Europe/Prague',
    'Europe/Rome','Europe/Stockholm','Europe/Vienna','Europe/Warsaw','Europe/Zurich',
    // India
    'Asia/Kolkata',
    // Rest (sampling of common)
    'Africa/Cairo','Africa/Johannesburg','Africa/Nairobi',
    'Asia/Bangkok','Asia/Dubai','Asia/Hong_Kong','Asia/Jakarta','Asia/Karachi','Asia/Kathmandu','Asia/Kuala_Lumpur','Asia/Manila','Asia/Seoul','Asia/Shanghai','Asia/Singapore','Asia/Taipei','Asia/Tokyo',
    'Australia/Adelaide','Australia/Brisbane','Australia/Melbourne','Australia/Perth','Australia/Sydney',
    'Pacific/Auckland','Pacific/Honolulu'
  ];
}

function orderedTimezones(): string[] {
  const all = Array.from(new Set(getAllTimezones()));
  const americas = all.filter(t => t.startsWith('America/')).sort();
  const europes = all.filter(t => t.startsWith('Europe/')).sort();
  const india = all.includes('Asia/Kolkata') ? ['Asia/Kolkata'] : [];
  const rest = all.filter(t => !t.startsWith('America/') && !t.startsWith('Europe/') && t !== 'Asia/Kolkata').sort();
  return [...americas, ...europes, ...india, ...rest];
}

function formatGmtOffset(tz: string): string {
  try {
    // Compute offset for Jan 1 and Jul 1 to pick the larger absolute value as typical current offset approximation
    const now = new Date();
    const dtf = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour12: false,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
    const parts = dtf.formatToParts(now);
    // Build a date string in that TZ
    const y = Number(parts.find(p => p.type === 'year')?.value || now.getUTCFullYear());
    const m = Number(parts.find(p => p.type === 'month')?.value || (now.getUTCMonth()+1));
    const d = Number(parts.find(p => p.type === 'day')?.value || now.getUTCDate());
    const hh = Number(parts.find(p => p.type === 'hour')?.value || now.getUTCHours());
    const mm = Number(parts.find(p => p.type === 'minute')?.value || now.getUTCMinutes());
    const ss = Number(parts.find(p => p.type === 'second')?.value || now.getUTCSeconds());
    // Date in that TZ interpreted as local wall time; compare to UTC date
    const asUTC = Date.UTC(y, m - 1, d, hh, mm, ss);
    const offsetMin = Math.round((asUTC - now.getTime()) / 60000);
    const sign = offsetMin <= 0 ? '+' : '-';
    const abs = Math.abs(offsetMin);
    const h = Math.floor(abs / 60);
    const mi = abs % 60;
    return `GMT${sign}${String(h).padStart(2, '0')}:${String(mi).padStart(2, '0')}`;
  } catch {
    return 'GMT±00:00';
  }
}

export function TimezoneDialog() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const detected = useMemo(() => {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch { return 'UTC'; }
  }, []);
  const [tz, setTz] = useState(detected);
  const zones = useMemo(() => orderedTimezones(), []);
  const isValidTz = useMemo(() => zones.includes(tz), [tz, zones]);
  const [saving, setSaving] = useState(false);

  const onSave = async () => {
    setSaving(true);
    try {
      await updateTimezone(tz);
      toast({ title: 'Timezone updated', description: tz });
      setOpen(false);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e?.message || 'Failed to update timezone' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">Set Timezone</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Account Timezone</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tz">Timezone</Label>
            <input
              id="tz"
              list="tzlist"
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
              value={tz}
              onChange={(e) => setTz(e.target.value)}
              placeholder="Type to search (e.g. America/Los_Angeles)"
              autoComplete="off"
            />
            <datalist id="tzlist">
              {zones.map((z) => (
                <option key={z} value={z} label={`${z} (${formatGmtOffset(z)})`}></option>
              ))}
            </datalist>
            <p className="text-xs text-muted-foreground">
              Detected: {detected}
              {isValidTz && ` · Selected offset: ${formatGmtOffset(tz)}`}
              {!isValidTz && tz.trim() && ' · Invalid timezone'}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setOpen(false)}>Cancel</Button>
            <Button className="flex-1" onClick={onSave} disabled={saving || !isValidTz}>{saving ? 'Saving…' : 'Save'}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default TimezoneDialog;
