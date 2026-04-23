import { useState, useCallback } from 'react'
import { getMyCodes, createCode, deleteCode, getJoinRequests, approveJoinRequest, rejectJoinRequest } from '../services/authService'

export function useInvites() {
  const [codes, setCodes] = useState([])
  const [requests, setRequests] = useState([])

  const fetchCodes = useCallback(async () => {
    try { const r = await getMyCodes(); setCodes(r.data) } catch {}
  }, [])

  const fetchRequests = useCallback(async () => {
    try { const r = await getJoinRequests(); setRequests(r.data) } catch {}
  }, [])

  const addCode = async (data) => {
    await createCode(data)
    await fetchCodes()
  }

  const removeCode = async (id) => {
    await deleteCode(id)
    await fetchCodes()
  }

  const approveReq = async (id) => {
    await approveJoinRequest(id)
    await fetchRequests()
  }

  const rejectReq = async (id) => {
    await rejectJoinRequest(id)
    await fetchRequests()
  }

  return {
    codes, fetchCodes, addCode, removeCode,
    requests, fetchRequests, approveReq, rejectReq,
  }
}
