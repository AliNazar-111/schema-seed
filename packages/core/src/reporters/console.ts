import { EffectReport } from '../types.js'

export function reportToConsole(report: EffectReport) {
    console.log('\n🚀 Seed Report')
    console.log('====================================')
    console.log(`Status:   ${report.success ? '✅ Success' : '❌ Failed'}`)
    console.log(`Duration: ${report.durationMs}ms`)
    console.log('------------------------------------')

    console.table(
        Object.entries(report.tables).map(([name, stats]) => ({
            Table: name,
            Rows: stats.insertedCount,
            Time: `${stats.durationMs}ms`,
            Status: stats.error ? '❌' : '✅'
        }))
    )

    if (report.errors.length > 0) {
        console.log('\nErrors:')
        report.errors.forEach((err, i) => {
            console.log(`${i + 1}. ${err.message}`)
        })
    }
    console.log('====================================\n')
}
