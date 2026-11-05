import FormField from '@/shared/components/common/FormField';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { newCollectionItem } from './websiteConfig.js';

export function WebsiteField({ id, label, value, onChange, multiline = false, type = 'text', required = false }) {
  const Component = multiline ? Textarea : Input;
  return (
    <FormField label={label} htmlFor={id} required={required}>
      <Component id={id} type={multiline ? undefined : type} value={value || ''} onChange={(event) => onChange(event.target.value)} required={required} />
    </FormField>
  );
}

export function WebsiteCollection({ collection, items, onChange, onUpload, uploadingId }) {
  function updateItem(id, field, value) {
    onChange(items.map((row) => row.id === id ? { ...row, [field]: value } : row));
  }

  return (
    <section className="border-t border-slate-200 pt-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-slate-900">{collection.title}</h2>
        <Button type="button" size="sm" variant="outline" disabled={items.length >= 100} onClick={() => onChange([...items, newCollectionItem(collection)])}>Add item</Button>
      </div>
      {collection.name === 'forms' && <p className="text-sm text-slate-600">Upload blank forms approved for public download. Published PDFs are visible to everyone.</p>}
      {items.length === 0 && <p className="text-sm text-slate-500">No {collection.title.toLowerCase()} in this draft.</p>}
      {items.map((item, index) => (
        <div key={item.id} className="border border-slate-200 rounded-lg p-4 space-y-4 bg-white">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-slate-700">{item.title || item.license_number || `Item ${index + 1}`}</h3>
            <Button type="button" size="sm" variant="ghost" className="text-red-700" onClick={() => onChange(items.filter((row) => row.id !== item.id))}>Remove</Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {collection.fields.map(([key, label, multiline, required]) => (
              <div key={key} className={multiline ? 'sm:col-span-2' : ''}>
                <WebsiteField id={`${collection.name}-${item.id}-${key}`} label={label} value={item[key]} multiline={multiline} required={required} onChange={(value) => updateItem(item.id, key, value)} />
              </div>
            ))}
            {collection.name === 'forms' && <>
              <FormField label="Form category" htmlFor={`category-${item.id}`}>
                <select id={`category-${item.id}`} className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm" value={item.category} onChange={(event) => updateItem(item.id, 'category', event.target.value)}>
                  <option value="general">General form</option>
                  <option value="employment_packet">Employment packet</option>
                  <option value="admission_packet">Admission packet</option>
                </select>
              </FormField>
              <FormField label="Public PDF" htmlFor={`file-${item.id}`} hint={uploadingId === item.id ? 'Uploading PDF...' : item.filename || 'Choose a PDF, up to 15 MB.'}>
                <Input id={`file-${item.id}`} type="file" accept="application/pdf,.pdf" onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) onUpload(item.id, file);
                  event.target.value = '';
                }} />
              </FormField>
            </>}
          </div>
        </div>
      ))}
    </section>
  );
}
