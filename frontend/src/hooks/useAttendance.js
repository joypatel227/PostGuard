import { useState, useCallback } from 'react'
import { getAttendanceByDate, getAttendanceByMonth, createAttendance, updateAttendance } from '../services/companyService'

export function useAttendance() {
  const [attendanceMode, setAttendanceMode] = useState('daily')
  const [attendanceDate, setAttendanceDate] = useState(() => new Date().toISOString().split('T')[0])
  const [attendanceMonth, setAttendanceMonth] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`
  })
  const [attendanceRecords, setAttendanceRecords] = useState([])
  const [monthlyAttendanceRecords, setMonthlyAttendanceRecords] = useState([])
  const [attLoading, setAttLoading] = useState(false)
  const [attendanceSearch, setAttendanceSearch] = useState('')
  const [attendanceWhatsApp, setAttendanceWhatsApp] = useState('')

  const fetchAttendance = useCallback(async () => {
    try {
      setAttLoading(true)
      if (attendanceMode === 'monthly') {
        const r = await getAttendanceByMonth(attendanceMonth)
        setMonthlyAttendanceRecords(r.data)
      } else {
        const r = await getAttendanceByDate(attendanceDate)
        setAttendanceRecords(r.data)
      }
    } catch {} finally { setAttLoading(false) }
  }, [attendanceDate, attendanceMonth, attendanceMode])

  const markAttendance = async (data) => {
    await createAttendance(data)
    await fetchAttendance()
  }

  const patchAttendance = async (id, data) => {
    await updateAttendance(id, data)
    await fetchAttendance()
  }

  return {
    attendanceMode, setAttendanceMode,
    attendanceDate, setAttendanceDate,
    attendanceMonth, setAttendanceMonth,
    attendanceRecords, monthlyAttendanceRecords,
    attLoading, fetchAttendance,
    attendanceSearch, setAttendanceSearch,
    attendanceWhatsApp, setAttendanceWhatsApp,
    markAttendance, patchAttendance,
  }
}
