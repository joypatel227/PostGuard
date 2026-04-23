import { useState, useCallback } from 'react'
import {
  getGuards, createGuard as apiCreateGuard, updateGuard as apiUpdateGuard,
  deleteGuard as apiDeleteGuard, toggleGuardDuty, assignGuard, transferGuard, bulkAttendance
} from '../services/companyService'

export function useGuards() {
  const [guards, setGuards] = useState([])

  const fetchGuards = useCallback(async () => {
    try {
      const r = await getGuards()
      setGuards(r.data)
    } catch {}
  }, [])

  const createGuard = async (data) => {
    await apiCreateGuard(data)
    await fetchGuards()
  }

  const updateGuard = async (id, data) => {
    await apiUpdateGuard(id, data)
    await fetchGuards()
  }

  const deleteGuard = async (id) => {
    await apiDeleteGuard(id)
    await fetchGuards()
  }

  const toggleDuty = async (id) => {
    await toggleGuardDuty(id)
    await fetchGuards()
  }

  const assignGuardToShift = async (guardId, data) => {
    await assignGuard(guardId, data)
    await fetchGuards()
  }

  const transferGuardToSite = async (data) => {
    await transferGuard(data)
    await fetchGuards()
  }

  const processBulkAttendance = async (text) => {
    const r = await bulkAttendance(text)
    await fetchGuards()
    return r.data
  }

  return {
    guards, fetchGuards,
    createGuard, updateGuard, deleteGuard,
    toggleDuty, assignGuardToShift, transferGuardToSite, processBulkAttendance,
  }
}
