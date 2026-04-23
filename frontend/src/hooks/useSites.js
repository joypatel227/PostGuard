import { useState, useCallback } from 'react'
import { getSites, createSite as apiCreateSite, updateSite as apiUpdateSite, deleteSite as apiDeleteSite, unlinkClient, createClientLogin } from '../services/companyService'
import { createShift as apiCreateShift, updateShift as apiUpdateShift, deleteShift as apiDeleteShift } from '../services/companyService'

export function useSites() {
  const [sites, setSites] = useState([])

  const fetchSites = useCallback(async () => {
    try {
      const r = await getSites()
      setSites(r.data)
    } catch {}
  }, [])

  const createSite = async (data) => {
    await apiCreateSite(data)
    await fetchSites()
  }

  const updateSite = async (id, data) => {
    await apiUpdateSite(id, data)
    await fetchSites()
  }

  const deleteSite = async (id) => {
    await apiDeleteSite(id)
    await fetchSites()
  }

  const toggleSite = async (site) => {
    await apiUpdateSite(site.id, { is_active: !site.is_active })
    await fetchSites()
  }

  const unlinkClientFromSite = async (siteId) => {
    await unlinkClient(siteId)
    await fetchSites()
  }

  const createClientForSite = async (siteId, data) => {
    await createClientLogin(siteId, data)
    await fetchSites()
  }

  const createShift = async (siteId, data) => {
    await apiCreateShift(siteId, data)
    await fetchSites()
  }

  const updateShift = async (id, data) => {
    await apiUpdateShift(id, data)
    await fetchSites()
  }

  const deleteShift = async (id) => {
    await apiDeleteShift(id)
    await fetchSites()
  }

  return {
    sites, fetchSites,
    createSite, updateSite, deleteSite, toggleSite,
    unlinkClientFromSite, createClientForSite,
    createShift, updateShift, deleteShift,
  }
}
