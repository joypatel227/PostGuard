import { useState, useCallback } from 'react'
import { getBills, generateBill, markBillPaid, deleteBill, getPayments, verifyPayment, rejectPayment } from '../services/billingService'

export function useBilling() {
  const [bills, setBills] = useState([])
  const [payments, setPayments] = useState([])
  const [billingMode, setBillingMode] = useState('overview')
  const [billingSearch, setBillingSearch] = useState('')

  const fetchBills = useCallback(async () => {
    try { const r = await getBills(); setBills(r.data) } catch {}
  }, [])

  const fetchPayments = useCallback(async () => {
    try { const r = await getPayments(); setPayments(r.data) } catch {}
  }, [])

  const createBill = async (data) => {
    await generateBill(data)
    await fetchBills()
  }

  const payBill = async (id) => {
    await markBillPaid(id)
    await fetchBills()
  }

  const removeBill = async (id) => {
    await deleteBill(id)
    await fetchBills()
  }

  const confirmPayment = async (id) => {
    await verifyPayment(id)
    await fetchPayments()
    await fetchBills()
  }

  const denyPayment = async (id, reason) => {
    await rejectPayment(id, reason)
    await fetchPayments()
  }

  return {
    bills, payments, billingMode, setBillingMode, billingSearch, setBillingSearch,
    fetchBills, fetchPayments, createBill, payBill, removeBill, confirmPayment, denyPayment,
  }
}
