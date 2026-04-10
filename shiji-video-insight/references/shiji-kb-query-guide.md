# Shiji KB Query Guide

Use this file to reduce drift when mining `shiji-kb`.

## Default Search Order

When the user wants topics or hidden insights, search in this order:

1. `README.md`
2. `labs/contradiction-analysis/`
3. `labs/source-inference/`
4. `kg/common-sense/`
5. `kg/events/`

This order moves from ready-made insight candidates to deeper supporting data.

## What Each Layer Is Good For

### 1. `README.md`

Use for:

- project-scale summary
- already-highlighted breakthroughs
- notable examples worth testing first

Good for fast orientation, not for final proof.

### 2. `labs/contradiction-analysis/`

Use for:

- cross-chapter contradictions
- numerical anomalies
- narrative silences already identified as anomalies

This is usually the best first stop for "find me something strange."

### 3. `labs/source-inference/`

Use for:

- deeper causal reinterpretation
- propaganda vs structure analysis
- source transmission and retelling
- mature long-form cases that can support a full video

This is usually the best first stop for "turn one anomaly into a serious video."

### 4. `kg/common-sense/`

Use for:

- checking whether a record violates institutional, demographic, military, or social expectations
- grounding "why this is strange"

Use this to support anomaly judgment, not to replace textual evidence.

### 5. `kg/events/`

Use for:

- rebuilding event chains
- finding linked events, dates, people, and relations
- pulling supporting structure after the lead anomaly is chosen

Use this after the topic is selected, not as the first scan layer.

## Fast Topic Discovery Patterns

### Broad request

For requests like "find several topics worth turning into videos", start with:

1. `README.md`
2. `labs/contradiction-analysis/README.md`
3. anomaly reports in contradiction-analysis
4. top cases in source-inference

### Concrete anomaly request

For requests like "Why does Qin Shi Huang have no empress record?", start with:

1. relevant anomaly report
2. contradiction-analysis README for category context
3. source-inference if a deeper case exists
4. `kg/common-sense/` for anomaly justification

### Person-first request

For requests like "make one episode around Xiang Yu", start with:

1. find anomaly angles around the person in contradiction-analysis or source-inference
2. only then use event and chapter material to build the chain

Do not begin by summarizing the full biography.

## Stop Conditions

Stop and avoid forcing a full script if:

- the topic only has one surprising fragment
- there is no comparison target
- the anomaly cannot be stated clearly in one sentence
- the explanation depends mostly on speculation
