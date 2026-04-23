import React, { useState, useRef, useEffect } from 'react'
import { CheckCircle, Download, Send, X, FileText } from 'lucide-react'
import api from '../services/api'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

// Simple Number to English Words Converter
// e.g. 28000 -> "TWENTY-EIGHT THOUSAND ONLY"
const numberToWords = (num) => {
  if (num === 0) return 'ZERO ONLY'
  const a = ['', 'ONE ', 'TWO ', 'THREE ', 'FOUR ', 'FIVE ', 'SIX ', 'SEVEN ', 'EIGHT ', 'NINE ', 'TEN ', 'ELEVEN ', 'TWELVE ', 'THIRTEEN ', 'FOURTEEN ', 'FIFTEEN ', 'SIXTEEN ', 'SEVENTEEN ', 'EIGHTEEN ', 'NINETEEN ']
  const b = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY']

  const inWords = (n) => {
    if ((n = n.toString()).length > 9) return 'overflow'
    let nArray = ('000000000' + n).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/)
    if (!nArray) return ''
    let str = ''
    str += (nArray[1] != 0) ? (a[Number(nArray[1])] || b[nArray[1][0]] + ' ' + a[nArray[1][1]]) + 'CRORE ' : ''
    str += (nArray[2] != 0) ? (a[Number(nArray[2])] || b[nArray[2][0]] + ' ' + a[nArray[2][1]]) + 'LAKH ' : ''
    str += (nArray[3] != 0) ? (a[Number(nArray[3])] || b[nArray[3][0]] + ' ' + a[nArray[3][1]]) + 'THOUSAND ' : ''
    str += (nArray[4] != 0) ? (a[Number(nArray[4])] || b[nArray[4][0]] + ' ' + a[nArray[4][1]]) + 'HUNDRED ' : ''
    str += (nArray[5] != 0) ? ((str != '') ? 'AND ' : '') + (a[Number(nArray[5])] || b[nArray[5][0]] + ' ' + a[nArray[5][1]]) : ''
    return str
  }
  return inWords(num).trim() + ' ONLY.'
}

// Helper for inline editing (moved out to stop focus loss)
const EditableValue = ({ value, onChange, type = "text", suffix = "", isReadonly = false }) => {
  if (isReadonly) return <span>{value}{suffix}</span>
  return (
    <input 
      type={type} 
      value={value} 
      onChange={onChange} 
      style={{ 
        background: 'rgba(124, 92, 255, 0.05)', 
        border: '1px dashed #7C5CFF', 
        borderRadius: '4px', 
        padding: '2px 6px', 
        color: '#000', 
        fontWeight: 'bold',
        width: 'auto',
        minWidth: '60px',
        textAlign: 'inherit',
        fontFamily: 'inherit'
      }} 
    />
  )
}

export default function InvoiceModal({ site, bankAccount, bill, isOpen, onClose, onSent, isClient = false }) {
  const [loading, setLoading] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const invoiceRef = useRef(null)
  const isGST = site?.invoice_format === 'gst'

  // Editable Internal State
  const [adjAmount, setAdjAmount] = useState(0)
  const [adjMonth, setAdjMonth] = useState(0)
  const [adjYear, setAdjYear] = useState(0)
  const [adjDate, setAdjDate] = useState('')
  const [adjGuards, setAdjGuards] = useState(1)
  
  // New Editable States for complete customization
  const [adjAgencyName, setAdjAgencyName] = useState('')
  const [adjClientName, setAdjClientName] = useState('')
  const [adjClientAddress, setAdjClientAddress] = useState('')
  const [adjContactPerson, setAdjContactPerson] = useState('-')
  const [adjEmail, setAdjEmail] = useState('')
  const [adjGstin, setAdjGstin] = useState('')
  const [adjPan, setAdjPan] = useState('')
  const [adjBankName, setAdjBankName] = useState('')
  const [adjBankBranch, setAdjBankBranch] = useState('')
  const [adjBankNo, setAdjBankNo] = useState('')
  const [adjBankIfsc, setAdjBankIfsc] = useState('')

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  useEffect(() => {
    if (isOpen && site) {
      const today = new Date()
      setAdjAmount(bill ? parseFloat(bill.amount) : parseFloat(site.monthly_amount || 0))
      setAdjMonth(bill ? bill.bill_month : today.getMonth() + 1)
      setAdjYear(bill ? bill.bill_year : today.getFullYear())
      setAdjDate(bill ? bill.bill_date : today.toISOString().split('T')[0])
      setAdjGuards(site.guard_count || 1) // Auto total guards from shift calculation
      
      setAdjAgencyName(site.agency_name || 'SECURITY AGENCY')
      setAdjClientName(site.name || '')
      setAdjClientAddress(site.address || '<Address>')
      setAdjEmail('email@gmail.com')
      setAdjGstin(site.client_gstin || '----------------')
      setAdjPan('___________')
      setAdjBankName(bankAccount?.bank_name || '___________')
      setAdjBankBranch(bankAccount?.account_name || '___________')
      setAdjBankNo(bankAccount?.account_no || '___________')
      setAdjBankIfsc(bankAccount?.ifsc || '___________')
    }
  }, [isOpen, bill, site, bankAccount])

  if (!isOpen || !site) return null

  // Derived Logic
  const currentMonthStr = new Date(adjYear, adjMonth - 1).toLocaleString('default', { month: 'long' })
  const dObj = new Date(adjDate)
  const dateDisplay = `${String(dObj.getDate()).padStart(2, '0')}/${String(dObj.getMonth() + 1).padStart(2, '0')}/${dObj.getFullYear()}`
  
  const totalAmount = adjAmount
  const guardsCount = adjGuards
  
  const normalRatePerHead = guardsCount > 0 ? totalAmount / guardsCount : 0
  const monthDays = new Date(adjYear, adjMonth, 0).getDate()
  const daysTotal = guardsCount * monthDays
  const gstRatePerDuty = daysTotal > 0 ? totalAmount / daysTotal : 0

  const handleDownloadPDF = async () => {
    if (!invoiceRef.current) return
    setDownloading(true)
    try {
      const element = invoiceRef.current
      const canvas = await html2canvas(element, {
        scale: 2, // Higher resolution
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      })
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('p', 'mm', 'a4')
      const imgProps = pdf.getImageProperties(imgData)
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)
      pdf.save(`Invoice_${site.name}_${currentMonthStr}_${adjYear}.pdf`)
    } catch (err) {
      console.error("PDF Export failed:", err)
      alert("Failed to generate PDF. You can try browser print (Ctrl+P) instead.")
    } finally {
      setDownloading(false)
    }
  }

  const handleSendBill = async () => {
    setLoading(true)
    try {
        const payload = {
            site: site.id,
            bank_account: bankAccount?.id || null,
            bill_type: isGST ? 'gst' : 'normal',
            amount: totalAmount,
            remaining: totalAmount,
            bill_month: adjMonth,
            bill_year: adjYear,
            bill_date: adjDate,
            gst_number: site.client_gstin || ''
        }
        await api.post('/billing/bills/', payload)
        onSent()
    } catch (err) {
        console.error(err)
        alert("Failed to send bill.")
    } finally {
        setLoading(false)
    }
  }



  const invoiceNum = `2026-27/${String(site.id).padStart(3, '0')}`

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)', zIndex: 10001, overflowY: 'auto', padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      
      {/* Controls Bar */}
      <div className="no-print" onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: '800px', display: 'flex', justifyContent: 'flex-end', gap: '15px', marginBottom: '20px' }}>
        {!bill && !isClient && (
          <div style={{ marginRight: 'auto', color: '#7C5CFF', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(124,92,255,0.1)', padding: '6px 12px', borderRadius: '20px' }}>
            <span style={{ fontSize: '1.2rem' }}>✎</span> Click dashed values to edit invoice
          </div>
        )}
        <button className="btn" onClick={onClose} disabled={loading} style={{ background: 'rgba(255,255,255,0.1)' }}><X size={18}/> Close</button>
        <button className="btn" onClick={handleDownloadPDF} disabled={downloading} style={{ background: 'rgba(0,229,160,0.15)', color: '#00E5A0', display: 'flex', alignItems: 'center', gap: '8px' }}>
          {downloading ? 'Capturing...' : <><Download size={18}/> Download PDF</>}
        </button>
        {!isClient && !bill && (
          <button className="btn btn-primary btn-glow" onClick={handleSendBill} disabled={loading} style={{ background: '#7C5CFF', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {loading ? 'Sending...' : <><Send size={18} /> Send to Site Panel</>}
          </button>
        )}
      </div>

      {/* Invoice Document Paper Container */}
      <div id="invoice-paper" ref={invoiceRef} onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: '800px', background: '#fff', color: '#000', borderRadius: '4px', boxShadow: '0px 20px 40px rgba(0,0,0,0.5)', padding: '40px', fontFamily: 'Arial, sans-serif', position: 'relative' }}>
        
        {!isGST ? (
            /* ========================================= */
            /* TEMPLATE A: NORMAL INVOICE                */
            /* ========================================= */
            <>
                <h1 style={{ textAlign: 'center', fontSize: '3rem', fontWeight: 900, textTransform: 'uppercase', marginBottom: '30px', letterSpacing: '-1px' }}>
                   <EditableValue isReadonly={Math.abs(1) && (!!bill || isClient)} value={adjAgencyName} onChange={e => setAdjAgencyName(e.target.value)} />
                </h1>
                
                <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', marginBottom: '20px' }}>
                    <tbody>
                        <tr>
                            <td style={{ border: '1px solid #000', padding: '10px', width: '50%', verticalAlign: 'top' }}>
                                <div style={{ fontSize: '14px', marginBottom: '10px' }}>Buyer Name</div>
                                <div style={{ fontSize: '24px', fontWeight: 'bold', textTransform: 'uppercase' }}>
                                  <EditableValue isReadonly={Math.abs(1) && (!!bill || isClient)} value={adjClientName} onChange={e => setAdjClientName(e.target.value)} />
                                </div>
                                <div style={{ fontSize: '14px', marginTop: '10px' }}>
                                    Place of Supply: - <EditableValue isReadonly={Math.abs(1) && (!!bill || isClient)} value={adjClientAddress} onChange={e => setAdjClientAddress(e.target.value)} />
                                </div>
                            </td>
                            <td style={{ border: '1px solid #000', padding: 0, width: '50%', verticalAlign: 'top' }}>
                                <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '22px', borderBottom: '1px solid #000', padding: '5px' }}>
                                    INVOICE
                                </div>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <tbody>
                                        <tr>
                                            <td style={{ borderBottom: '1px solid #000', borderRight: '1px solid #000', padding: '8px 10px', width: '40%' }}>INVOICE NO.</td>
                                            <td style={{ borderBottom: '1px solid #000', padding: '8px 10px' }}>{bill?.id ? `BILL/${bill.id}` : invoiceNum}</td>
                                        </tr>
                                        <tr>
                                            <td style={{ borderBottom: '1px solid #000', borderRight: '1px solid #000', padding: '8px 10px' }}>DATE</td>
                                            <td style={{ borderBottom: '1px solid #000', padding: '8px 10px' }}>
                                              <EditableValue isReadonly={Math.abs(1) && (!!bill || isClient)} type="date" value={adjDate} onChange={e => setAdjDate(e.target.value)} />
                                            </td>
                                        </tr>
                                        <tr>
                                            <td style={{ borderRight: '1px solid #000', padding: '8px 10px' }}>For the month of</td>
                                            <td style={{ padding: '8px 10px' }}>
                                              {!bill && !isClient ? (
                                                <div style={{ display: 'flex', gap: '4px' }}>
                                                  <select value={adjMonth} onChange={e => setAdjMonth(parseInt(e.target.value))} style={{ border: '1px dashed #7C5CFF', borderRadius: '4px', fontSize: '12px' }}>
                                                    {Array.from({length:12}, (_,i)=>i+1).map(m => <option key={m} value={m}>{new Date(2000, m-1).toLocaleString('default', {month:'long'})}</option>)}
                                                  </select>
                                                  <input type="number" value={adjYear} onChange={e => setAdjYear(parseInt(e.target.value))} style={{ width: '60px', border: '1px dashed #7C5CFF', borderRadius: '4px', fontSize: '12px' }} />
                                                </div>
                                              ) : (
                                                currentMonthStr
                                              )}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </td>
                        </tr>
                        <tr>
                            <td style={{ border: '1px solid #000', padding: '8px 10px' }}>Contact Person: - </td>
                            <td style={{ border: '1px solid #000', padding: '8px 10px' }}>
                              <EditableValue isReadonly={Math.abs(1) && (!!bill || isClient)} value={adjContactPerson} onChange={e => setAdjContactPerson(e.target.value)} />
                            </td>
                        </tr>
                        <tr>
                            <td style={{ border: '1px solid #000', padding: '8px 10px' }}>Email address: - </td>
                            <td style={{ border: '1px solid #000', padding: '8px 10px', textTransform: 'uppercase' }}>
                              <EditableValue isReadonly={Math.abs(1) && (!!bill || isClient)} value={adjEmail} onChange={e => setAdjEmail(e.target.value)} />
                            </td>
                        </tr>
                    </tbody>
                </table>

                <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', textAlign: 'center', marginBottom: '0px' }}>
                    <thead>
                        <tr style={{ fontWeight: 'bold' }}>
                            <th style={{ border: '1px solid #000', padding: '10px' }}>S/N.</th>
                            <th style={{ border: '1px solid #000', padding: '10px' }}>Services</th>
                            <th style={{ border: '1px solid #000', padding: '10px' }}>Rate per head</th>
                            <th style={{ border: '1px solid #000', padding: '10px' }}>No. of<br/>Person</th>
                            <th style={{ border: '1px solid #000', padding: '10px' }}>No. of<br/>duty</th>
                            <th style={{ border: '1px solid #000', padding: '10px' }}>Total Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr style={{ height: '350px', verticalAlign: 'top' }}>
                            <td style={{ borderLeft: '1px solid #000', borderRight: '1px solid #000', padding: '20px 10px' }}>1.</td>
                            <td style={{ borderRight: '1px solid #000', padding: '20px 10px' }}>Security Guard</td>
                            <td style={{ borderRight: '1px solid #000', padding: '20px 10px' }}>{normalRatePerHead.toFixed(0)}</td>
                            <td style={{ borderRight: '1px solid #000', padding: '20px 10px' }}>
                                <EditableValue isReadonly={Math.abs(1) && (!!bill || isClient)} type="number" value={adjGuards} onChange={e => setAdjGuards(parseInt(e.target.value))} />
                            </td>
                            <td style={{ borderRight: '1px solid #000', padding: '20px 10px' }}>{daysTotal}</td>
                            <td style={{ borderRight: '1px solid #000', padding: '20px 10px' }}>
                                <EditableValue isReadonly={Math.abs(1) && (!!bill || isClient)} type="number" value={adjAmount} onChange={e => setAdjAmount(parseFloat(e.target.value))} />
                            </td>
                        </tr>
                    </tbody>
                </table>

                <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', borderTop: 'none' }}>
                    <tbody>
                        <tr>
                            <td style={{ border: '1px solid #000', padding: '10px', width: '20%' }}>Amount in word</td>
                            <td style={{ border: '1px solid #000', padding: '10px', fontWeight: 'bold' }}>{numberToWords(totalAmount)}</td>
                            <td style={{ border: '1px solid #000', padding: '10px', width: '20%', fontWeight: 'bold', textAlign: 'center' }}>Rs.<br/>{totalAmount.toFixed(2)}</td>
                        </tr>
                        <tr>
                            <td style={{ border: '1px solid #000', padding: '10px' }}>Due Date</td>
                            <td colSpan="2" style={{ border: '1px solid #000', padding: '10px', textTransform: 'uppercase', fontSize: '13px' }}>
                                THE PAYMENT MUST REACH OUR OFFICE LATEST BY 1ST WEEK OF MONTH AND SHALL EXPECT THE PAYMENT WITHIN 5 DAYS, AS WE SHALL PAY OUR STAFF BY 10TH OF EACH MONTH.
                            </td>
                        </tr>
                    </tbody>
                </table>

                <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', borderTop: 'none', marginBottom: '40px' }}>
                    <tbody>
                        <tr>
                            <td style={{ border: '1px solid #000', padding: '10px', width: '33%', verticalAlign: 'top' }}>
                                PAN NO. <br/><EditableValue isReadonly={Math.abs(1) && (!!bill || isClient)} value={adjPan} onChange={e => setAdjPan(e.target.value)} />
                            </td>
                            <td style={{ border: '1px solid #000', padding: '10px', width: '34%', verticalAlign: 'top' }}>
                                Bank Name<br/>
                                A/C. No.<br/>
                                Branch/IFSC Code
                            </td>
                            <td style={{ border: '1px solid #000', padding: '10px', width: '33%', verticalAlign: 'top' }}>
                                <EditableValue isReadonly={Math.abs(1) && (!!bill || isClient)} value={adjBankName} onChange={e => setAdjBankName(e.target.value)} /><br/>
                                <EditableValue isReadonly={Math.abs(1) && (!!bill || isClient)} value={adjBankNo} onChange={e => setAdjBankNo(e.target.value)} /><br/>
                                <EditableValue isReadonly={Math.abs(1) && (!!bill || isClient)} value={adjBankIfsc} onChange={e => setAdjBankIfsc(e.target.value)} />
                            </td>
                        </tr>
                    </tbody>
                </table>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                    <div>Customer sign</div>
                    <div>For {site.agency_name || 'AGENCY'}</div>
                </div>

                <div style={{ textAlign: 'center', marginTop: '60px', fontStyle: 'italic', fontSize: '18px' }}>
                    Thank you for your Cooperation
                </div>
            </>
        ) : (
            /* ========================================= */
            /* TEMPLATE B: GST TAX-INVOICE               */
            /* ========================================= */
            <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', borderBottom: '2px solid #ed8936', paddingBottom: '20px' }}>
                    <div style={{ width: '120px', height: '120px', border: '1px dashed #ccc', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '10px', color: '#666', fontSize: '12px', background: '#f9f9f9' }}>
                        [Upload Logo<br/>in Settings]
                    </div>
                    <div style={{ textAlign: 'left', flex: 1, paddingLeft: '30px' }}>
                        <h1 style={{ color: '#0d47a1', fontSize: '24px', fontWeight: 900, textTransform: 'uppercase', marginBottom: '8px' }}>
                            <EditableValue isReadonly={Math.abs(1) && (!!bill || isClient)} value={adjAgencyName} onChange={e => setAdjAgencyName(e.target.value)} />
                        </h1>
                        <div style={{ color: '#b91c1c', fontSize: '13px', fontWeight: 'bold', marginBottom: '5px' }}>
                            <EditableValue isReadonly={Math.abs(1) && (!!bill || isClient)} value={adjClientAddress} onChange={e => setAdjClientAddress(e.target.value)} />
                        </div>
                        <div style={{ color: '#0d47a1', fontSize: '13px', fontWeight: 'bold' }}>
                            CONTACT NO: - &nbsp;&nbsp;&nbsp;&nbsp; E-MAIL: <EditableValue isReadonly={Math.abs(1) && (!!bill || isClient)} value={adjEmail} onChange={e => setAdjEmail(e.target.value)} />
                        </div>
                    </div>
                </div>

                <div style={{ textAlign: 'right', fontWeight: 'bold', marginBottom: '10px', fontSize: '13px' }}>
                    DATE: <EditableValue isReadonly={Math.abs(1) && (!!bill || isClient)} type="date" value={adjDate} onChange={e => setAdjDate(e.target.value)} />
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', marginBottom: '0px' }}>
                    <tbody>
                        <tr>
                            <td colSpan="2" style={{ border: '1px solid #000', textAlign: 'center', fontWeight: 'bold', padding: '4px', background: '#f5f5f5' }}>TAX-INVOICE</td>
                            <td style={{ border: '1px solid #000', textAlign: 'center', fontWeight: 'bold', padding: '4px', width: '20%' }}>Original</td>
                        </tr>
                        <tr>
                            <td style={{ border: '1px solid #000', padding: '10px', width: '10%', verticalAlign: 'top', fontWeight: 'bold' }}>M/S :</td>
                            <td style={{ border: '1px solid #000', padding: '10px', width: '45%', verticalAlign: 'top' }}>
                                <div style={{ fontSize: '18px', marginBottom: '10px' }}>
                                  <EditableValue isReadonly={Math.abs(1) && (!!bill || isClient)} value={adjClientName} onChange={e => setAdjClientName(e.target.value)} />
                                </div>
                                <div style={{ fontSize: '13px', textTransform: 'uppercase' }}>
                                  <EditableValue isReadonly={Math.abs(1) && (!!bill || isClient)} value={adjClientAddress} onChange={e => setAdjClientAddress(e.target.value)} />
                                </div>
                            </td>
                            <td style={{ border: '1px solid #000', padding: '0px', verticalAlign: 'top' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                    <tbody>
                                        <tr>
                                            <td style={{ padding: '8px' }}>Invoice No.</td>
                                            <td>:- {bill?.id ? `BILL/${bill.id}` : invoiceNum}</td>
                                        </tr>
                                        <tr>
                                            <td style={{ padding: '8px', paddingTop: '20px' }}>Date</td>
                                            <td style={{ paddingTop: '20px' }}>:- <EditableValue isReadonly={Math.abs(1) && (!!bill || isClient)} type="date" value={adjDate} onChange={e => setAdjDate(e.target.value)} /></td>
                                        </tr>
                                        <tr>
                                            <td style={{ padding: '8px' }}>PAN NO.</td>
                                            <td>:- <EditableValue isReadonly={Math.abs(1) && (!!bill || isClient)} value={adjPan} onChange={e => setAdjPan(e.target.value)} /></td>
                                        </tr>
                                        <tr>
                                            <td colSpan="2" style={{ padding: '8px' }}>
                                              Bill For Month of&nbsp;
                                              {!bill && !isClient ? (
                                                <div style={{ display: 'inline-flex', gap: '4px' }}>
                                                  <select value={adjMonth} onChange={e => setAdjMonth(parseInt(e.target.value))} style={{ border: '1px dashed #7C5CFF', borderRadius: '4px', fontSize: '11px' }}>
                                                    {Array.from({length:12}, (_,i)=>i+1).map(m => <option key={m} value={m}>{new Date(2000, m-1).toLocaleString('default', {month:'long'}).toUpperCase()}</option>)}
                                                  </select>
                                                  <input type="number" value={adjYear} onChange={e => setAdjYear(parseInt(e.target.value))} style={{ width: '56px', border: '1px dashed #7C5CFF', borderRadius: '4px', fontSize: '11px' }} />
                                                </div>
                                              ) : (
                                                `${currentMonthStr.toUpperCase()} - ${adjYear}`
                                              )}
                                            </td>
                                        </tr>
                                        <tr>
                                            <td style={{ padding: '8px' }}>GSTIN</td>
                                            <td>:- -</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </td>
                        </tr>
                        <tr>
                            <td colSpan="3" style={{ border: '1px solid #000', padding: '10px', fontWeight: 'bold', fontSize: '13px' }}>
                                GSTIN : <EditableValue isReadonly={Math.abs(1) && (!!bill || isClient)} value={adjGstin} onChange={e => setAdjGstin(e.target.value)} />
                            </td>
                        </tr>
                    </tbody>
                </table>

                <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', borderTop: 'none', textAlign: 'center' }}>
                    <thead>
                        <tr style={{ fontSize: '13px' }}>
                            <th style={{ border: '1px solid #000', padding: '8px' }}>Sr. No</th>
                            <th style={{ border: '1px solid #000', padding: '8px' }}>Particulars</th>
                            <th style={{ border: '1px solid #000', padding: '8px' }}>HSN/SAC<br/>Code</th>
                            <th style={{ border: '1px solid #000', padding: '8px' }}>No. Of<br/>Duty</th>
                            <th style={{ border: '1px solid #000', padding: '8px' }}>Rate<br/>Per<br/>Head</th>
                            <th style={{ border: '1px solid #000', padding: '8px' }}>GST %</th>
                            <th style={{ border: '1px solid #000', padding: '8px' }}>Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr style={{ height: '150px', verticalAlign: 'top', fontSize: '14px' }}>
                            <td style={{ borderLeft: '1px solid #000', borderRight: '1px solid #000', padding: '15px 5px' }}>1</td>
                            <td style={{ borderRight: '1px solid #000', padding: '15px 5px' }}>Security Guards</td>
                            <td style={{ borderRight: '1px solid #000', padding: '15px 5px' }}>999259</td>
                            <td style={{ borderRight: '1px solid #000', padding: '15px 5px' }}>{daysTotal}</td>
                            <td style={{ borderRight: '1px solid #000', padding: '15px 5px' }}>{gstRatePerDuty.toFixed(2)}</td>
                            <td style={{ borderRight: '1px solid #000', padding: '15px 5px' }}>18%</td>
                            <td style={{ borderRight: '1px solid #000', padding: '15px 5px' }}>
                               <EditableValue isReadonly={Math.abs(1) && (!!bill || isClient)} type="number" value={adjAmount} onChange={e => setAdjAmount(parseFloat(e.target.value))} />
                            </td>
                        </tr>
                        <tr style={{ borderTop: '1px solid #000', borderBottom: '1px solid #000' }}>
                            <td colSpan="6" style={{ borderRight: '1px solid #000', textAlign: 'center', padding: '5px', fontWeight: 'bold' }}>TOTAL:</td>
                            <td style={{ padding: '5px', fontWeight: 'bold' }}>{totalAmount.toFixed(0)}</td>
                        </tr>
                    </tbody>
                </table>

                <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', borderTop: 'none', fontSize: '13px' }}>
                    <tbody>
                        <tr>
                            <td style={{ borderRight: '1px solid #000', borderBottom: '1px solid #ccc', padding: '6px 10px', width: '50%', background: '#fafafa' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '100px 20px 1fr' }}>
                                    <div>Bank Name</div><div>:-</div><div><EditableValue isReadonly={Math.abs(1) && (!!bill || isClient)} value={adjBankName} onChange={e => setAdjBankName(e.target.value)} /></div>
                                    <div>Branch</div><div>:-</div><div><EditableValue isReadonly={Math.abs(1) && (!!bill || isClient)} value={adjBankBranch} onChange={e => setAdjBankBranch(e.target.value)} /></div>
                                    <div>Bank A/C No</div><div>:-</div><div><EditableValue isReadonly={Math.abs(1) && (!!bill || isClient)} value={adjBankNo} onChange={e => setAdjBankNo(e.target.value)} /></div>
                                    <div>IFSC Code</div><div>:-</div><div><EditableValue isReadonly={Math.abs(1) && (!!bill || isClient)} value={adjBankIfsc} onChange={e => setAdjBankIfsc(e.target.value)} /></div>
                                </div>
                            </td>
                            <td style={{ padding: 0, verticalAlign: 'top', width: '50%' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <tbody>
                                        <tr>
                                            <td style={{ borderBottom: '1px solid #000', padding: '10px 10px' }}>GST On reverse Charge</td>
                                            <td style={{ borderBottom: '1px solid #000', borderLeft: '1px solid #000', padding: '10px 10px', textAlign: 'center' }}>YES</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </td>
                        </tr>
                        <tr>
                            <td style={{ borderRight: '1px solid #000', borderBottom: '1px solid #ccc', padding: '6px 10px' }}>
                                <div style={{ display: 'flex' }}><div style={{ width: '120px' }}>Total GST</div><div>:- NA</div></div>
                            </td>
                            <td style={{ padding: 0, verticalAlign: 'top' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <tbody>
                                        <tr>
                                            <td style={{ borderBottom: '1px solid #000', padding: '6px 10px' }}>CGST<span style={{ float: 'right' }}>0.00%</span></td>
                                            <td style={{ borderBottom: '1px solid #000', borderLeft: '1px solid #000', padding: '6px 10px', textAlign: 'right' }}>0</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </td>
                        </tr>
                        <tr>
                            <td style={{ borderRight: '1px solid #000', padding: '6px 10px', verticalAlign: 'top' }}>
                                <div style={{ display: 'flex' }}><div style={{ width: '120px' }}>Total Amount</div><div>:- {numberToWords(totalAmount).toLowerCase().replace(/^\w/, c => c.toUpperCase())}</div></div>
                            </td>
                            <td style={{ padding: 0, verticalAlign: 'top' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <tbody>
                                        <tr>
                                            <td style={{ borderBottom: '1px solid #000', padding: '6px 10px' }}>SGST<span style={{ float: 'right' }}>0.00%</span></td>
                                            <td style={{ borderBottom: '1px solid #000', borderLeft: '1px solid #000', padding: '6px 10px', textAlign: 'right' }}>0</td>
                                        </tr>
                                        <tr>
                                            <td style={{ padding: '6px 10px' }}>Total GST</td>
                                            <td style={{ borderLeft: '1px solid #000', padding: '6px 10px', textAlign: 'right' }}>0</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </td>
                        </tr>
                    </tbody>
                </table>
                <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', borderTop: 'none', background: '#ffff00', fontSize: '18px' }}>
                    <tbody>
                        <tr>
                            <td style={{ padding: '10px', textAlign: 'center', fontWeight: 'bold' }}>Grand Total <span style={{ float: 'right', paddingRight: '20px' }}>{totalAmount.toFixed(0)}</span></td>
                        </tr>
                    </tbody>
                </table>

            </>
        )}
      </div>

    </div>
  )
}
