import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, ChevronUp, ChevronDown, ArrowRight, Download } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { admissionPacketUrl, ADMISSION_PACKET_ITEMS } from '@/shared/utils/packets';
export default function AdmissionPacket({ stateCode }) {
  const [packetOpen, setPacketOpen] = useState(false);
  const admissionItems = ADMISSION_PACKET_ITEMS[stateCode] || [];
  return (<>
          {/* Admission Packet Section */}
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader className="p-4 pb-3 border-b border-slate-100">
              <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <FileText className="h-4 w-4 text-emerald-600" />
                State Admission Packet ({stateCode})
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Official statutory disclosures and service rights packet for your records.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPacketOpen(!packetOpen)}
                className="h-7 text-xs border-slate-200 text-slate-700 hover:bg-slate-50 gap-1 mb-3"
              >
                {packetOpen ? <>Hide included disclosures <ChevronUp size={12} /></> : <>View included disclosures ({admissionItems.length}) <ChevronDown size={12} /></>}
              </Button>

              {packetOpen && (
                <ul className="list-disc pl-5 mb-4 text-xs text-slate-600 space-y-1">
                  {admissionItems.map((item) => <li key={item}>{item}</li>)}
                </ul>
              )}

              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" size="sm" asChild className="h-8 text-xs border-slate-200 text-slate-700 hover:bg-slate-50 gap-1.5">
                  <a
                    href={admissionPacketUrl(stateCode)}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Download size={13} />
                    Download Complete Packet (PDF)
                  </a>
                </Button>
                <Button variant="outline" size="sm" asChild className="h-8 text-xs border-slate-200 text-slate-700 hover:bg-slate-50 gap-1.5">
                  <Link to="/client/documents">
                    Upload Documents <ArrowRight size={13} />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>  </>);
}
