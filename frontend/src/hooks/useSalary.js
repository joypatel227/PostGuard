import { useState, useCallback } from 'react'
import { getSalaries, payoutSalary, undoPayout } from '../services/salaryService'

export function useSalary() {
  const [salaries, setSalaries] = useState([])
  const [salaryMonth, setSalaryMonth] = useState(new Date().getMonth() + 1)
  const [salaryYear, setSalaryYear] = useState(new Date().getFullYear())
  const [salaryLoading, setSalaryLoading] = useState(false)
  const [salarySearch, setSalarySearch] = useState('')

  const fetchSalaries = useCallback(async (m, y) => {
    try {
      setSalaryLoading(true)
      const r = await getSalaries(m || salaryMonth, y || salaryYear)
      setSalaries(r.data)
    } catch {} finally { setSalaryLoading(false) }
  }, [salaryMonth, salaryYear])

  const paySalary = async (id, data) => {
    await payoutSalary(id, data)
    await fetchSalaries()
  }

  const undoSalaryPayout = async (id) => {
    await undoPayout(id)
    await fetchSalaries()
  }

  return {
    salaries, salaryMonth, setSalaryMonth, salaryYear, setSalaryYear,
    salaryLoading, salarySearch, setSalarySearch,
    fetchSalaries, paySalary, undoSalaryPayout,
  }
}
