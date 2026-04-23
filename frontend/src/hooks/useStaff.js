import { useState, useCallback } from 'react'
import { getAgencyUsers, createAgencyUser, deleteAgencyUser } from '../services/authService'

export function useStaff() {
  const [supervisors, setSupervisors] = useState([])
  const [admins, setAdmins] = useState([])

  const fetchSups = useCallback(async () => {
    try {
      const r = await getAgencyUsers('supervisor')
      setSupervisors(r.data)
    } catch {}
  }, [])

  const fetchAdmins = useCallback(async () => {
    try {
      const r = await getAgencyUsers('admin')
      setAdmins(r.data)
    } catch {}
  }, [])

  const createStaffMember = async (data) => {
    await createAgencyUser(data)
    if (data.role === 'admin') await fetchAdmins()
    else await fetchSups()
  }

  const deleteStaffMember = async (id, role) => {
    await deleteAgencyUser(id)
    if (role === 'admin') await fetchAdmins()
    else await fetchSups()
  }

  return { supervisors, admins, fetchSups, fetchAdmins, createStaffMember, deleteStaffMember }
}
