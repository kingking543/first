# 回测基线冻结说明

原报告生成后，用户确认调整量化逻辑。为避免复现时误用新版函数，scripts/research/baseline-lotto.ts保存了报告当时src/lib/lotto.ts的逐字节副本，其SHA256与results.json.productionCodeSha256相同。原回测与消融脚本现在显式导入该冻结模块，历史结果不重写。run-backtest.ts记录的gitCommit为原基线d8a1108，另以runGitCommit记录复跑时的仓库版本。

新逻辑只在后续工程检查中评估，工程检查使用原来已看过的末300期，不能称为新的样本外证明。原报告中的“当前量化”应理解为V1。
