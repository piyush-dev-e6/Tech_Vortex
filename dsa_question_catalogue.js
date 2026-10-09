/* Curated, static DSA practice catalogue. Problem and community-solution URLs
 * are derived from each official LeetCode problem slug. */
window.DSA_QUESTION_CATALOGUE = [
  { topic: 'Arrays', subtopic: 'Basic Array Operations', questions: [
    ['two-sum', 'Two Sum', 'Easy', 'Hash map stores complements for one-pass lookup'],
    ['best-time-to-buy-and-sell-stock', 'Best Time to Buy and Sell Stock', 'Easy', 'Track the lowest price seen before each day'],
    ['contains-duplicate', 'Contains Duplicate', 'Easy', 'Detect repeated values with a set']
  ]},
  { topic: 'Arrays', subtopic: 'Prefix Sum and Difference Arrays', questions: [
    ['find-pivot-index', 'Find Pivot Index', 'Easy', 'Compare prefix and suffix sums'],
    ['range-sum-query-immutable', 'Range Sum Query - Immutable', 'Easy', 'Answer range queries from prefix sums']
  ]},
  { topic: 'Arrays', subtopic: "Kadane's Algorithm", questions: [
    ['maximum-subarray', 'Maximum Subarray', 'Medium', 'Kadane recurrence tracks the best ending sum'],
    ['maximum-product-subarray', 'Maximum Product Subarray', 'Medium', 'Track maximum and minimum products ending here']
  ]},
  { topic: 'Arrays', subtopic: 'Sorting-Based Problems', questions: [
    ['missing-number', 'Missing Number', 'Easy', 'Compare expected and observed totals']
  ]},
  { topic: 'Arrays', subtopic: 'Cyclic Sort and Index Placement', questions: [
    ['first-missing-positive', 'First Missing Positive', 'Hard', 'Place each value at its matching index in place']
  ]},
  { topic: 'Arrays', subtopic: 'Matrix and 2D Array Problems', questions: [
    ['set-matrix-zeroes', 'Set Matrix Zeroes', 'Medium', 'Use the first row and column as markers'],
    ['spiral-matrix', 'Spiral Matrix', 'Medium', 'Traverse shrinking matrix boundaries']
  ]},
  { topic: 'Arrays', subtopic: 'Array Manipulation and In-Place Algorithms', questions: [
    ['product-of-array-except-self', 'Product of Array Except Self', 'Medium', 'Combine prefix and suffix products'],
    ['rotate-image', 'Rotate Image', 'Medium', 'Transpose then reverse rows in place']
  ]},

  { topic: 'Strings', subtopic: 'Basic String Manipulation', questions: [
    ['reverse-string', 'Reverse String', 'Easy', 'Swap characters from both ends'],
    ['roman-to-integer', 'Roman to Integer', 'Easy', 'Compare adjacent symbol values'],
    ['longest-common-prefix', 'Longest Common Prefix', 'Easy', 'Shrink a shared prefix across strings']
  ]},
  { topic: 'Strings', subtopic: 'Character Frequency and Counting', questions: [
    ['valid-anagram', 'Valid Anagram', 'Easy', 'Compare character frequency counts'],
    ['count-and-say', 'Count and Say', 'Medium', 'Run-length encode each generated term']
  ]},
  { topic: 'Strings', subtopic: 'Palindromes', questions: [
    ['longest-palindromic-substring', 'Longest Palindromic Substring', 'Medium', 'Expand around each possible center']
  ]},
  { topic: 'Strings', subtopic: 'Anagrams', questions: [
    ['find-all-anagrams-in-a-string', 'Find All Anagrams in a String', 'Medium', 'Compare fixed-window character frequencies']
  ]},
  { topic: 'Strings', subtopic: 'Pattern Matching', questions: [
    ['find-the-index-of-the-first-occurrence-in-a-string', 'Find the Index of the First Occurrence in a String', 'Easy', 'Find a pattern with substring matching'],
    ['repeated-substring-pattern', 'Repeated Substring Pattern', 'Easy', 'Test whether a string is built from a repeated shorter pattern']
  ]},
  { topic: 'Strings', subtopic: 'String Parsing and Transformation', questions: [
    ['string-to-integer-atoi', 'String to Integer (atoi)', 'Medium', 'Parse signs, digits, whitespace, and bounds'],
    ['zigzag-conversion', 'Zigzag Conversion', 'Medium', 'Simulate row direction while distributing characters'],
    ['multiply-strings', 'Multiply Strings', 'Medium', 'Multiply digit arrays without big integers'],
    ['decode-string', 'Decode String', 'Medium', 'Use nested counts and substrings to parse brackets']
  ]},

  { topic: 'Hashing', subtopic: 'Hash Maps and Frequency Counting', questions: [
    ['isomorphic-strings', 'Isomorphic Strings', 'Easy', 'Maintain a consistent mapping in both directions'],
    ['group-anagrams', 'Group Anagrams', 'Medium', 'Group strings by canonical character counts'],
    ['top-k-frequent-elements', 'Top K Frequent Elements', 'Medium', 'Count values before selecting the most frequent'],
    ['ransom-note', 'Ransom Note', 'Easy', 'Consume available letter counts'],
    ['valid-sudoku', 'Valid Sudoku', 'Medium', 'Track row, column, and box membership']
  ]},
  { topic: 'Hashing', subtopic: 'Hash Sets', questions: [
    ['longest-consecutive-sequence', 'Longest Consecutive Sequence', 'Medium', 'Start sequences only at values without predecessors'],
    ['intersection-of-two-arrays', 'Intersection of Two Arrays', 'Easy', 'Use sets to find unique common values']
  ]},
  { topic: 'Hashing', subtopic: 'Pair and Triplet Sum Problems', questions: [
    ['four-sum-ii', '4Sum II', 'Medium', 'Count pair sums from two arrays in a map']
  ]},
  { topic: 'Hashing', subtopic: 'Grouping and Categorization', questions: [
    ['design-hashmap', 'Design HashMap', 'Easy', 'Implement key-value storage with bucket indexing'],
    ['insert-delete-getrandom-o1', 'Insert Delete GetRandom O(1)', 'Medium', 'Combine an array and index map for constant-time operations']
  ]},
  { topic: 'Hashing', subtopic: 'Prefix Sum with Hashing', questions: [
    ['subarray-sum-equals-k', 'Subarray Sum Equals K', 'Medium', 'Count earlier prefix sums that complete the target']
  ]},
  { topic: 'Hashing', subtopic: 'Hash-Based Design', questions: [
    ['lru-cache', 'LRU Cache', 'Medium', 'Combine a hash map with an ordered doubly linked list'],
    ['first-unique-character-in-a-string', 'First Unique Character in a String', 'Easy', 'Count characters then locate the first singleton'],
    ['find-all-duplicates-in-an-array', 'Find All Duplicates in an Array', 'Medium', 'Use value-index marking to find repeated values']
  ]},

  { topic: 'Two Pointers', subtopic: 'Opposite-Direction Pointers', questions: [
    ['valid-palindrome', 'Valid Palindrome', 'Easy', 'Compare normalized characters from both ends'],
    ['container-with-most-water', 'Container With Most Water', 'Medium', 'Move the shorter boundary inward'],
    ['trapping-rain-water', 'Trapping Rain Water', 'Hard', 'Track the maximum boundary on each side']
  ]},
  { topic: 'Two Pointers', subtopic: 'Same-Direction Pointers', questions: [
    ['remove-duplicates-from-sorted-array', 'Remove Duplicates from Sorted Array', 'Easy', 'Write each new sorted value to the next slot'],
    ['is-subsequence', 'Is Subsequence', 'Easy', 'Advance through the source as target characters match']
  ]},
  { topic: 'Two Pointers', subtopic: 'Sorted Array Problems', questions: [
    ['3sum', '3Sum', 'Medium', 'Sort once, then sweep each remaining pair'],
    ['4sum', '4Sum', 'Medium', 'Sort and reduce each quadruplet search to two pointers'],
    ['squares-of-a-sorted-array', 'Squares of a Sorted Array', 'Easy', 'Fill output from the largest endpoint square']
  ]},
  { topic: 'Two Pointers', subtopic: 'In-Place Array Modification', questions: [
    ['remove-element', 'Remove Element', 'Easy', 'Overwrite retained values with a write pointer'],
    ['move-zeroes', 'Move Zeroes', 'Easy', 'Compact nonzero values, then fill the tail']
  ]},
  { topic: 'Two Pointers', subtopic: 'Three-Pointer Problems', questions: [
    ['sort-colors', 'Sort Colors', 'Medium', 'Partition low, middle, and high values in one pass'],
    ['boats-to-save-people', 'Boats to Save People', 'Medium', 'Pair the lightest and heaviest feasible passengers'],
    ['backspace-string-compare', 'Backspace String Compare', 'Easy', 'Compare visible characters while scanning backward']
  ]},

  { topic: 'Sliding Window', subtopic: 'Fixed-Size Windows', questions: [
    ['permutation-in-string', 'Permutation in String', 'Medium', 'Maintain character counts for a fixed window'],
    ['maximum-average-subarray-i', 'Maximum Average Subarray I', 'Easy', 'Update a rolling sum as the window shifts'],
    ['number-of-sub-arrays-of-size-k-and-average-greater-than-or-equal-to-threshold', 'Number of Sub-arrays of Size K and Average Greater than or Equal to Threshold', 'Medium', 'Compare each fixed-window sum to a threshold']
  ]},
  { topic: 'Sliding Window', subtopic: 'Variable-Size Windows', questions: [
    ['minimum-size-subarray-sum', 'Minimum Size Subarray Sum', 'Medium', 'Shrink the positive-sum window when it meets the target'],
    ['longest-repeating-character-replacement', 'Longest Repeating Character Replacement', 'Medium', 'Keep replacement budget within the current window']
  ]},
  { topic: 'Sliding Window', subtopic: 'Longest and Shortest Valid Subarrays', questions: [
    ['max-consecutive-ones-iii', 'Max Consecutive Ones III', 'Medium', 'Allow at most k zeroes inside the window'],
    ['fruit-into-baskets', 'Fruit Into Baskets', 'Medium', 'Keep no more than two distinct values in the window']
  ]},
  { topic: 'Sliding Window', subtopic: 'Frequency-Based Windows', questions: [
    ['longest-substring-without-repeating-characters', 'Longest Substring Without Repeating Characters', 'Medium', 'Move the left edge past duplicate characters'],
    ['subarrays-with-k-different-integers', 'Subarrays with K Different Integers', 'Hard', 'Subtract two at-most distinct window counts']
  ]},
  { topic: 'Sliding Window', subtopic: 'String Window Problems', questions: [
    ['minimum-window-substring', 'Minimum Window Substring', 'Hard', 'Expand for required characters and contract while valid'],
    ['minimum-window-subsequence', 'Minimum Window Subsequence', 'Hard', 'Find the shortest window that contains a sequence in order'],
    ['longest-nice-subarray', 'Longest Nice Subarray', 'Medium', 'Shrink until the bitwise AND constraints are restored'],
    ['grumpy-bookstore-owner', 'Grumpy Bookstore Owner', 'Medium', 'Use one window to maximize a recoverable sum']
  ]},

  { topic: 'Binary Search', subtopic: 'Basic Binary Search', questions: [
    ['binary-search', 'Binary Search', 'Easy', 'Discard half of the sorted search range'],
    ['search-insert-position', 'Search Insert Position', 'Easy', 'Find the lower-bound insertion index'],
    ['guess-number-higher-or-lower', 'Guess Number Higher or Lower', 'Easy', 'Narrow the range from comparison feedback']
  ]},
  { topic: 'Binary Search', subtopic: 'First and Last Occurrence', questions: [
    ['find-first-and-last-position-of-element-in-sorted-array', 'Find First and Last Position of Element in Sorted Array', 'Medium', 'Run lower and upper boundary searches']
  ]},
  { topic: 'Binary Search', subtopic: 'Lower Bound and Upper Bound', questions: [
    ['find-peak-element', 'Find Peak Element', 'Medium', 'Follow the rising slope to locate a peak']
  ]},
  { topic: 'Binary Search', subtopic: 'Search in Rotated Arrays', questions: [
    ['find-minimum-in-rotated-sorted-array', 'Find Minimum in Rotated Sorted Array', 'Medium', 'Compare the midpoint with the right boundary'],
    ['search-in-rotated-sorted-array', 'Search in Rotated Sorted Array', 'Medium', 'Identify the sorted half before narrowing']
  ]},
  { topic: 'Binary Search', subtopic: 'Binary Search on the Answer', questions: [
    ['koko-eating-bananas', 'Koko Eating Bananas', 'Medium', 'Binary search the minimum feasible eating speed'],
    ['capacity-to-ship-packages-within-d-days', 'Capacity To Ship Packages Within D Days', 'Medium', 'Binary search the smallest feasible capacity'],
    ['split-array-largest-sum', 'Split Array Largest Sum', 'Hard', 'Search the minimum possible largest partition sum']
  ]},
  { topic: 'Binary Search', subtopic: 'Binary Search in 2D Matrices', questions: [
    ['search-a-2d-matrix', 'Search a 2D Matrix', 'Medium', 'Search a row-major matrix as one sorted range'],
    ['search-a-2d-matrix-ii', 'Search a 2D Matrix II', 'Medium', 'Eliminate a row or column from a sorted corner']
  ]},
  { topic: 'Binary Search', subtopic: 'Advanced Search', questions: [
    ['median-of-two-sorted-arrays', 'Median of Two Sorted Arrays', 'Hard', 'Binary search a balanced partition across two arrays'],
    ['time-based-key-value-store', 'Time Based Key-Value Store', 'Medium', 'Binary search timestamps for the latest valid value']
  ]},

  { topic: 'Sorting', subtopic: 'Comparison Sorting', questions: [
    ['sort-an-array', 'Sort an Array', 'Medium', 'Apply an efficient comparison sort'],
    ['largest-number', 'Largest Number', 'Medium', 'Sort by comparing concatenated number strings'],
    ['sort-array-by-increasing-frequency', 'Sort Array by Increasing Frequency', 'Easy', 'Sort by frequency then by value']
  ]},
  { topic: 'Sorting', subtopic: 'Merge Sort', questions: [
    ['merge-sorted-array', 'Merge Sorted Array', 'Easy', 'Merge from the end to avoid overwriting values'],
    ['sort-list', 'Sort List', 'Medium', 'Split linked lists and merge sorted halves']
  ]},
  { topic: 'Sorting', subtopic: 'Quick Sort and Partitioning', questions: [
    ['sort-array-by-parity-ii', 'Sort Array By Parity II', 'Easy', 'Place even and odd values into alternating slots']
  ]},
  { topic: 'Sorting', subtopic: 'Counting and Bucket-Based Techniques', questions: [
    ['relative-sort-array', 'Relative Sort Array', 'Easy', 'Use frequencies and a custom ordering rank'],
    ['maximum-gap', 'Maximum Gap', 'Medium', 'Use buckets to avoid sorting every value pair']
  ]},
  { topic: 'Sorting', subtopic: 'Sorting-Based Greedy Problems', questions: [
    ['minimum-increment-to-make-array-unique', 'Minimum Increment to Make Array Unique', 'Medium', 'Sort values and greedily advance duplicates'],
    ['largest-perimeter-triangle', 'Largest Perimeter Triangle', 'Easy', 'Check adjacent sorted sides from largest downward'],
    ['queue-reconstruction-by-height', 'Queue Reconstruction by Height', 'Medium', 'Sort by height and insert at each person’s rank'],
    ['pancake-sorting', 'Pancake Sorting', 'Medium', 'Place the largest remaining item with prefix reversals']
  ]},
  { topic: 'Sorting', subtopic: 'Array Ordering', questions: [
    ['wiggle-sort-ii', 'Wiggle Sort II', 'Medium', 'Interleave lower and upper sorted halves']
  ]},

  { topic: 'Linked Lists', subtopic: 'Traversal and Basic Operations', questions: [
    ['merge-two-sorted-lists', 'Merge Two Sorted Lists', 'Easy', 'Relink nodes behind a sentinel head'],
    ['add-two-numbers', 'Add Two Numbers', 'Medium', 'Add linked-list digits while carrying overflow'],
    ['swap-nodes-in-pairs', 'Swap Nodes in Pairs', 'Medium', 'Relink adjacent nodes iteratively']
  ]},
  { topic: 'Linked Lists', subtopic: 'Fast and Slow Pointers', questions: [
    ['middle-of-the-linked-list', 'Middle of the Linked List', 'Easy', 'Move slow and fast pointers at different speeds']
  ]},
  { topic: 'Linked Lists', subtopic: 'Reversal', questions: [
    ['reverse-linked-list', 'Reverse Linked List', 'Easy', 'Reverse next pointers with a moving previous node'],
    ['reorder-list', 'Reorder List', 'Medium', 'Split, reverse, and weave the two list halves']
  ]},
  { topic: 'Linked Lists', subtopic: 'Cycle Detection', questions: [
    ['linked-list-cycle', 'Linked List Cycle', 'Easy', 'Detect a cycle with Floyd pointers'],
    ['linked-list-cycle-ii', 'Linked List Cycle II', 'Medium', 'Find the cycle entry after pointer convergence']
  ]},
  { topic: 'Linked Lists', subtopic: 'Merging and Sorting Lists', questions: [
    ['remove-nth-node-from-end-of-list', 'Remove Nth Node From End of List', 'Medium', 'Keep a fixed gap between two pointers'],
    ['merge-k-sorted-lists', 'Merge k Sorted Lists', 'Hard', 'Merge list heads with a min heap']
  ]},
  { topic: 'Linked Lists', subtopic: 'Intersection of Linked Lists', questions: [
    ['intersection-of-two-linked-lists', 'Intersection of Two Linked Lists', 'Easy', 'Switch list heads to equalize traversal distance'],
    ['palindrome-linked-list', 'Palindrome Linked List', 'Easy', 'Reverse the second half and compare']
  ]},
  { topic: 'Linked Lists', subtopic: 'Doubly and Circular Linked Lists', questions: [
    ['flatten-a-multilevel-doubly-linked-list', 'Flatten a Multilevel Doubly Linked List', 'Medium', 'Traverse and reconnect nested doubly linked nodes']
  ]},

  { topic: 'Stacks', subtopic: 'Stack Fundamentals', questions: [
    ['min-stack', 'Min Stack', 'Medium', 'Track the minimum alongside pushed values'],
    ['asteroid-collision', 'Asteroid Collision', 'Medium', 'Resolve opposing directions against the stack top']
  ]},
  { topic: 'Stacks', subtopic: 'Valid Parentheses', questions: [
    ['valid-parentheses', 'Valid Parentheses', 'Easy', 'Match closing delimiters with the most recent opener']
  ]},
  { topic: 'Stacks', subtopic: 'Monotonic Stacks', questions: [
    ['daily-temperatures', 'Daily Temperatures', 'Medium', 'Resolve colder days with a decreasing stack'],
    ['online-stock-span', 'Online Stock Span', 'Medium', 'Compress previous prices with a monotonic stack']
  ]},
  { topic: 'Stacks', subtopic: 'Next Greater and Next Smaller Elements', questions: [
    ['next-greater-element-i', 'Next Greater Element I', 'Easy', 'Precompute next greater values with a stack'],
    ['next-greater-element-ii', 'Next Greater Element II', 'Medium', 'Scan a circular array with a monotonic stack']
  ]},
  { topic: 'Stacks', subtopic: 'Expression Evaluation', questions: [
    ['evaluate-reverse-polish-notation', 'Evaluate Reverse Polish Notation', 'Medium', 'Evaluate operands as operators arrive'],
    ['basic-calculator', 'Basic Calculator', 'Hard', 'Use a stack to evaluate nested signed expressions']
  ]},
  { topic: 'Stacks', subtopic: 'Histogram and Rectangle Problems', questions: [
    ['largest-rectangle-in-histogram', 'Largest Rectangle in Histogram', 'Hard', 'Find each bar’s span with monotonic boundaries'],
    ['maximal-rectangle', 'Maximal Rectangle', 'Hard', 'Reduce each matrix row to a histogram area problem']
  ]},
  { topic: 'Stacks', subtopic: 'Stack-Based String Processing', questions: [
    ['remove-k-digits', 'Remove K Digits', 'Medium', 'Remove larger preceding digits with a monotonic stack'],
    ['132-pattern', '132 Pattern', 'Medium', 'Scan backward while tracking a candidate middle value']
  ]},

  { topic: 'Queues and Deques', subtopic: 'Queue Fundamentals', questions: [
    ['number-of-recent-calls', 'Number of Recent Calls', 'Easy', 'Discard timestamps outside the active time range'],
    ['implement-queue-using-stacks', 'Implement Queue using Stacks', 'Easy', 'Amortize queue operations across two stacks'],
    ['moving-average-from-data-stream', 'Moving Average from Data Stream', 'Easy', 'Maintain a rolling sum for the bounded queue']
  ]},
  { topic: 'Queues and Deques', subtopic: 'Circular Queues', questions: [
    ['design-circular-queue', 'Design Circular Queue', 'Medium', 'Wrap front and rear indices through a fixed buffer'],
    ['design-front-middle-back-queue', 'Design Front Middle Back Queue', 'Medium', 'Balance two deques around the middle'],
    ['design-circular-deque', 'Design Circular Deque', 'Medium', 'Support insertion and deletion at both circular ends']
  ]},
  { topic: 'Queues and Deques', subtopic: 'Monotonic Deques', questions: [
    ['jump-game-vi', 'Jump Game VI', 'Medium', 'Use a deque to retain the best scores in range']
  ]},
  { topic: 'Queues and Deques', subtopic: 'Sliding Window Maximum', questions: [
    ['sliding-window-maximum', 'Sliding Window Maximum', 'Hard', 'Keep decreasing candidate indices in a deque']
  ]},
  { topic: 'Queues and Deques', subtopic: 'Queue-Based Simulation', questions: [
    ['reveal-cards-in-increasing-order', 'Reveal Cards In Increasing Order', 'Medium', 'Simulate card reveal and rotation operations'],
    ['dota2-senate', 'Dota2 Senate', 'Medium', 'Queue each senator’s next available round'],
    ['first-unique-number', 'First Unique Number', 'Medium', 'Track arrival order while updating frequency state'],
    ['snake-and-ladders', 'Snakes and Ladders', 'Medium', 'Use BFS over board positions and die rolls']
  ]},
  { topic: 'Queues and Deques', subtopic: 'Monotonic Deques', questions: [
    ['shortest-subarray-with-sum-at-least-k', 'Shortest Subarray with Sum at Least K', 'Hard', 'Use prefix sums and a monotonic deque']
  ]},

  { topic: 'Recursion and Backtracking', subtopic: 'Basic Recursion', questions: [
    ['fibonacci-number', 'Fibonacci Number', 'Easy', 'Define each term recursively from the two preceding terms']
  ]},
  { topic: 'Recursion and Backtracking', subtopic: 'Subsets and Subsequences', questions: [
    ['subsets', 'Subsets', 'Medium', 'Choose or skip each input value'],
    ['subsets-ii', 'Subsets II', 'Medium', 'Sort input and skip duplicate choices']
  ]},
  { topic: 'Recursion and Backtracking', subtopic: 'Permutations and Combinations', questions: [
    ['permutations', 'Permutations', 'Medium', 'Build orderings with a used-value set'],
    ['permutations-ii', 'Permutations II', 'Medium', 'Skip equal values already used at the current depth']
  ]},
  { topic: 'Recursion and Backtracking', subtopic: 'Combination Sum', questions: [
    ['combination-sum', 'Combination Sum', 'Medium', 'Reuse candidates while reducing the remaining target'],
    ['combination-sum-ii', 'Combination Sum II', 'Medium', 'Use each candidate once and skip same-depth duplicates']
  ]},
  { topic: 'Recursion and Backtracking', subtopic: 'String Backtracking', questions: [
    ['letter-combinations-of-a-phone-number', 'Letter Combinations of a Phone Number', 'Medium', 'Choose one mapped letter for each digit'],
    ['palindrome-partitioning', 'Palindrome Partitioning', 'Medium', 'Branch at each palindromic prefix']
  ]},
  { topic: 'Recursion and Backtracking', subtopic: 'Constraint Satisfaction', questions: [
    ['n-queens', 'N-Queens', 'Hard', 'Place queens while tracking attacked columns and diagonals'],
    ['sudoku-solver', 'Sudoku Solver', 'Hard', 'Try valid digits under row, column, and box constraints']
  ]},
  { topic: 'Recursion and Backtracking', subtopic: 'Pruning and Search Optimization', questions: [
    ['word-search', 'Word Search', 'Medium', 'Prune board paths that cannot match the next character'],
    ['matchsticks-to-square', 'Matchsticks to Square', 'Medium', 'Assign descending lengths to four bounded sides']
  ]},

  { topic: 'Trees and Binary Search Trees', subtopic: 'Tree Traversals', questions: [
    ['binary-tree-inorder-traversal', 'Binary Tree Inorder Traversal', 'Easy', 'Visit left subtree, node, then right subtree'],
    ['binary-tree-preorder-traversal', 'Binary Tree Preorder Traversal', 'Easy', 'Visit each node before its child subtrees']
  ]},
  { topic: 'Trees and Binary Search Trees', subtopic: 'Level-Order Traversal', questions: [
    ['binary-tree-level-order-traversal', 'Binary Tree Level Order Traversal', 'Medium', 'Process a queue one level at a time'],
    ['binary-tree-right-side-view', 'Binary Tree Right Side View', 'Medium', 'Keep the last visible node at each level']
  ]},
  { topic: 'Trees and Binary Search Trees', subtopic: 'Tree Height and Diameter', questions: [
    ['maximum-depth-of-binary-tree', 'Maximum Depth of Binary Tree', 'Easy', 'Return one plus the greater child height'],
    ['diameter-of-binary-tree', 'Diameter of Binary Tree', 'Easy', 'Combine child heights at each candidate path center']
  ]},
  { topic: 'Trees and Binary Search Trees', subtopic: 'Path-Based Problems', questions: [
    ['path-sum', 'Path Sum', 'Easy', 'Subtract node values while following a root-to-leaf path']
  ]},
  { topic: 'Trees and Binary Search Trees', subtopic: 'Lowest Common Ancestor', questions: [
    ['lowest-common-ancestor-of-a-binary-search-tree', 'Lowest Common Ancestor of a Binary Search Tree', 'Easy', 'Use BST ordering to find the split point']
  ]},
  { topic: 'Trees and Binary Search Trees', subtopic: 'Binary Search Tree Operations', questions: [
    ['validate-binary-search-tree', 'Validate Binary Search Tree', 'Medium', 'Check every node against inherited bounds'],
    ['kth-smallest-element-in-a-bst', 'Kth Smallest Element in a BST', 'Medium', 'Use inorder ordering to count visited values']
  ]},
  { topic: 'Trees and Binary Search Trees', subtopic: 'Construction and Serialization', questions: [
    ['construct-binary-tree-from-preorder-and-inorder-traversal', 'Construct Binary Tree from Preorder and Inorder Traversal', 'Medium', 'Use traversal order and an index map to split subtrees'],
    ['serialize-and-deserialize-binary-tree', 'Serialize and Deserialize Binary Tree', 'Hard', 'Encode node values and null markers consistently']
  ]},
  { topic: 'Trees and Binary Search Trees', subtopic: 'Tree Views and Properties', questions: [
    ['invert-binary-tree', 'Invert Binary Tree', 'Easy', 'Swap left and right subtrees recursively'],
    ['binary-tree-postorder-traversal', 'Binary Tree Postorder Traversal', 'Easy', 'Visit child subtrees before their parent']
  ]},

  { topic: 'Heaps and Priority Queues', subtopic: 'Heap Fundamentals', questions: [
    ['last-stone-weight', 'Last Stone Weight', 'Easy', 'Repeatedly remove the two largest values']
  ]},
  { topic: 'Heaps and Priority Queues', subtopic: 'Top-K Problems', questions: [
    ['k-closest-points-to-origin', 'K Closest Points to Origin', 'Medium', 'Keep the nearest points with a bounded heap']
  ]},
  { topic: 'Heaps and Priority Queues', subtopic: 'Kth Largest and Smallest Elements', questions: [
    ['kth-largest-element-in-an-array', 'Kth Largest Element in an Array', 'Medium', 'Use a size-k heap or partition selection'],
    ['kth-largest-element-in-a-stream', 'Kth Largest Element in a Stream', 'Easy', 'Maintain the k largest values in a min heap'],
    ['kth-smallest-element-in-a-sorted-matrix', 'Kth Smallest Element in a Sorted Matrix', 'Medium', 'Merge sorted matrix rows with a min heap']
  ]},
  { topic: 'Heaps and Priority Queues', subtopic: 'Merging Sorted Sequences', questions: [
    ['find-k-pairs-with-smallest-sums', 'Find K Pairs with Smallest Sums', 'Medium', 'Advance the next lowest pair from sorted rows']
  ]},
  { topic: 'Heaps and Priority Queues', subtopic: 'Two-Heap Techniques', questions: [
    ['find-median-from-data-stream', 'Find Median from Data Stream', 'Hard', 'Balance a lower max heap and upper min heap']
  ]},
  { topic: 'Heaps and Priority Queues', subtopic: 'Scheduling and Priority-Based Problems', questions: [
    ['reorganize-string', 'Reorganize String', 'Medium', 'Choose the most frequent available character'],
    ['task-scheduler', 'Task Scheduler', 'Medium', 'Schedule tasks by frequency with cooldown intervals'],
    ['ipo', 'IPO', 'Hard', 'Choose the most profitable currently affordable project'],
    ['furthest-building-you-can-reach', 'Furthest Building You Can Reach', 'Medium', 'Use ladders on the largest climbs seen so far'],
    ['smallest-range-covering-elements-from-k-lists', 'Smallest Range Covering Elements from K Lists', 'Hard', 'Advance the current minimum among sorted lists'],
    ['find-kth-smallest-pair-distance', 'Find K-th Smallest Pair Distance', 'Hard', 'Binary search a candidate distance and count qualifying sorted pairs']
  ]},

  { topic: 'Graphs', subtopic: 'Graph Representation', questions: [
    ['clone-graph', 'Clone Graph', 'Medium', 'Map original nodes to copied nodes during traversal']
  ]},
  { topic: 'Graphs', subtopic: 'Breadth-First Search', questions: [
    ['rotting-oranges', 'Rotting Oranges', 'Medium', 'Run multi-source BFS in minute layers']
  ]},
  { topic: 'Graphs', subtopic: 'Depth-First Search', questions: [
    ['number-of-islands', 'Number of Islands', 'Medium', 'Explore and mark each connected land region'],
    ['pacific-atlantic-water-flow', 'Pacific Atlantic Water Flow', 'Medium', 'Traverse uphill from each ocean boundary']
  ]},
  { topic: 'Graphs', subtopic: 'Connected Components', questions: [
    ['accounts-merge', 'Accounts Merge', 'Medium', 'Connect accounts that share an email address']
  ]},
  { topic: 'Graphs', subtopic: 'Cycle Detection', questions: [
    ['course-schedule', 'Course Schedule', 'Medium', 'Detect cycles in a directed prerequisite graph'],
    ['redundant-connection', 'Redundant Connection', 'Medium', 'Find the edge that closes an undirected cycle']
  ]},
  { topic: 'Graphs', subtopic: 'Topological Sorting', questions: [
    ['course-schedule-ii', 'Course Schedule II', 'Medium', 'Return a topological order of prerequisites']
  ]},
  { topic: 'Graphs', subtopic: 'Shortest Paths', questions: [
    ['network-delay-time', 'Network Delay Time', 'Medium', 'Relax nonnegative edge distances with Dijkstra'],
    ['word-ladder', 'Word Ladder', 'Hard', 'Find the shortest transformation sequence with BFS']
  ]},
  { topic: 'Graphs', subtopic: 'Union-Find / Disjoint Set Union', questions: [
    ['number-of-provinces', 'Number of Provinces', 'Medium', 'Merge cities in the same connected component with disjoint sets']
  ]},
  { topic: 'Graphs', subtopic: 'Minimum Spanning Trees', questions: [
    ['min-cost-to-connect-all-points', 'Min Cost to Connect All Points', 'Medium', 'Build a minimum spanning tree from pairwise distances']
  ]},
  { topic: 'Graphs', subtopic: 'Grid-Based Graph Problems', questions: [
    ['is-graph-bipartite', 'Is Graph Bipartite?', 'Medium', 'Two-color every component using graph traversal'],
    ['critical-connections-in-a-network', 'Critical Connections in a Network', 'Hard', 'Find bridges using discovery and low-link times'],
    ['evaluate-division', 'Evaluate Division', 'Medium', 'Answer ratios by traversing a weighted graph']
  ]},

  { topic: 'Greedy Algorithms', subtopic: 'Interval Scheduling', questions: [
    ['non-overlapping-intervals', 'Non-overlapping Intervals', 'Medium', 'Keep intervals with earliest finishing times']
  ]},
  { topic: 'Greedy Algorithms', subtopic: 'Activity Selection', questions: [
    ['maximum-number-of-events-that-can-be-attended', 'Maximum Number of Events That Can Be Attended', 'Medium', 'Attend the available event that ends soonest']
  ]},
  { topic: 'Greedy Algorithms', subtopic: 'Interval Merging and Selection', questions: [
    ['maximum-length-of-pair-chain', 'Maximum Length of Pair Chain', 'Medium', 'Select compatible pairs in earliest-finish order']
  ]},
  { topic: 'Greedy Algorithms', subtopic: 'Sorting-Based Greedy', questions: [
    ['assign-cookies', 'Assign Cookies', 'Easy', 'Sort greed and appetite before matching'],
    ['maximum-units-on-a-truck', 'Maximum Units on a Truck', 'Easy', 'Take box types in descending unit value']
  ]},
  { topic: 'Greedy Algorithms', subtopic: 'Resource Allocation', questions: [
    ['gas-station', 'Gas Station', 'Medium', 'Restart after any segment with a negative net balance'],
    ['two-city-scheduling', 'Two City Scheduling', 'Medium', 'Sort by the relative cost of assigning each person']
  ]},
  { topic: 'Greedy Algorithms', subtopic: 'Greedy Choice and Optimization Problems', questions: [
    ['can-place-flowers', 'Can Place Flowers', 'Easy', 'Plant whenever both adjacent plots permit it'],
    ['jump-game', 'Jump Game', 'Medium', 'Track the farthest reachable index'],
    ['partition-labels', 'Partition Labels', 'Medium', 'Close a partition at the latest character occurrence'],
    ['candy', 'Candy', 'Hard', 'Combine left-to-right and right-to-left rating constraints'],
    ['lemonade-change', 'Lemonade Change', 'Easy', 'Prefer larger change bills when serving customers'],
    ['jump-game-ii', 'Jump Game II', 'Medium', 'Extend each greedy jump layer to the farthest next reach']
  ]},

  { topic: 'Dynamic Programming', subtopic: 'One-Dimensional DP', questions: [
    ['house-robber', 'House Robber', 'Medium', 'Choose between taking this value or skipping it'],
    ['decode-ways', 'Decode Ways', 'Medium', 'Count valid one-digit and two-digit decodings']
  ]},
  { topic: 'Dynamic Programming', subtopic: 'Climbing Stairs and Fibonacci Patterns', questions: [
    ['climbing-stairs', 'Climbing Stairs', 'Easy', 'Build each step count from the two previous states']
  ]},
  { topic: 'Dynamic Programming', subtopic: 'Grid and Two-Dimensional DP', questions: [
    ['unique-paths', 'Unique Paths', 'Medium', 'Accumulate ways from the top and left cells'],
    ['minimum-path-sum', 'Minimum Path Sum', 'Medium', 'Store the cheapest path cost reaching each cell']
  ]},
  { topic: 'Dynamic Programming', subtopic: 'Knapsack Patterns', questions: [
    ['coin-change', 'Coin Change', 'Medium', 'Build the fewest coins needed for each amount'],
    ['partition-equal-subset-sum', 'Partition Equal Subset Sum', 'Medium', 'Track reachable sums with each value used once'],
    ['target-sum', 'Target Sum', 'Medium', 'Count signed assignments through sum-state transitions']
  ]},
  { topic: 'Dynamic Programming', subtopic: 'Subsequence DP', questions: [
    ['longest-increasing-subsequence', 'Longest Increasing Subsequence', 'Medium', 'Track subsequence tails with binary search']
  ]},
  { topic: 'Dynamic Programming', subtopic: 'Longest Increasing Subsequence', questions: [
    ['russian-doll-envelopes', 'Russian Doll Envelopes', 'Hard', 'Sort one dimension and find an increasing subsequence in the other']
  ]},
  { topic: 'Dynamic Programming', subtopic: 'Longest Common Subsequence and String DP', questions: [
    ['longest-common-subsequence', 'Longest Common Subsequence', 'Medium', 'Build a two-dimensional prefix matching table'],
    ['edit-distance', 'Edit Distance', 'Hard', 'Choose insertion, deletion, or replacement for each prefix']
  ]},
  { topic: 'Dynamic Programming', subtopic: 'Interval DP', questions: [
    ['burst-balloons', 'Burst Balloons', 'Hard', 'Choose the last balloon for each interval']
  ]},
  { topic: 'Dynamic Programming', subtopic: 'State-Machine DP', questions: [
    ['best-time-to-buy-and-sell-stock-with-cooldown', 'Best Time to Buy and Sell Stock with Cooldown', 'Medium', 'Track holding, sold, and cooldown states']
  ]},
  { topic: 'Dynamic Programming', subtopic: 'Bitmask DP, Where Appropriate', questions: [
    ['minimum-cost-to-connect-two-groups-of-points', 'Minimum Cost to Connect Two Groups of Points', 'Hard', 'Represent covered vertices with a bitmask state']
  ]},

  { topic: 'Tries', subtopic: 'Trie Fundamentals', questions: [
    ['implement-trie-prefix-tree', 'Implement Trie (Prefix Tree)', 'Medium', 'Store shared prefixes in child-node paths'],
    ['map-sum-pairs', 'Map Sum Pairs', 'Medium', 'Store key values and aggregate sums along prefixes']
  ]},
  { topic: 'Tries', subtopic: 'Prefix Search', questions: [
    ['replace-words', 'Replace Words', 'Medium', 'Stop at the first dictionary root along a word'],
    ['longest-word-in-dictionary', 'Longest Word in Dictionary', 'Medium', 'Extend only prefixes that are complete words']
  ]},
  { topic: 'Tries', subtopic: 'Word Dictionary Problems', questions: [
    ['design-add-and-search-words-data-structure', 'Design Add and Search Words Data Structure', 'Medium', 'Branch trie traversal for wildcard characters']
  ]},
  { topic: 'Tries', subtopic: 'Word Search and Board-Based Problems', questions: [
    ['word-search-ii', 'Word Search II', 'Hard', 'Guide board backtracking with a trie of target words']
  ]},
  { topic: 'Tries', subtopic: 'Binary Tries and XOR', questions: [
    ['maximum-xor-of-two-numbers-in-an-array', 'Maximum XOR of Two Numbers in an Array', 'Medium', 'Greedily choose opposite bits in a binary trie'],
    ['stream-of-characters', 'Stream of Characters', 'Hard', 'Search a reversed trie from newest stream characters'],
    ['concatenated-words', 'Concatenated Words', 'Hard', 'Use trie prefixes with word-break dynamic programming'],
    ['search-suggestions-system', 'Search Suggestions System', 'Medium', 'Return lexicographically ordered words under each prefix'],
    ['prefix-and-suffix-search', 'Prefix and Suffix Search', 'Hard', 'Index combined prefix and suffix keys in a trie'],
    ['short-encoding-of-words', 'Short Encoding of Words', 'Medium', 'Remove words that are suffixes of longer words'],
    ['palindrome-pairs', 'Palindrome Pairs', 'Hard', 'Match reversed prefixes and suffixes with a trie']
  ]},

  { topic: 'Bit Manipulation', subtopic: 'Bitwise Operators', questions: [
    ['sum-of-two-integers', 'Sum of Two Integers', 'Medium', 'Combine XOR partial sums with shifted carries'],
    ['bitwise-and-of-numbers-range', 'Bitwise AND of Numbers Range', 'Medium', 'Find the shared high-order prefix of the range']
  ]},
  { topic: 'Bit Manipulation', subtopic: 'Set, Clear, and Toggle Bits', questions: [
    ['power-of-two', 'Power of Two', 'Easy', 'Check that exactly one bit is set'],
    ['power-of-four', 'Power of Four', 'Easy', 'Check one set bit in an even bit position']
  ]},
  { topic: 'Bit Manipulation', subtopic: 'XOR Patterns', questions: [
    ['single-number', 'Single Number', 'Easy', 'XOR cancels values that occur in pairs'],
    ['hamming-distance', 'Hamming Distance', 'Easy', 'Count set bits in the XOR of two values']
  ]},
  { topic: 'Bit Manipulation', subtopic: 'Bit Counting', questions: [
    ['number-of-1-bits', 'Number of 1 Bits', 'Easy', 'Clear the least significant set bit repeatedly'],
    ['counting-bits', 'Counting Bits', 'Easy', 'Reuse the count for a smaller bit state'],
    ['reverse-bits', 'Reverse Bits', 'Easy', 'Shift bits into reverse order']
  ]},
  { topic: 'Bit Manipulation', subtopic: 'Bitmasking', questions: [
    ['gray-code', 'Gray Code', 'Medium', 'Construct a sequence where adjacent values differ by one bit']
  ]},
  { topic: 'Bit Manipulation', subtopic: 'Bitwise Optimization Problems', questions: [
    ['maximum-product-of-word-lengths', 'Maximum Product of Word Lengths', 'Medium', 'Represent each word’s letters as a bitmask'],
    ['total-hamming-distance', 'Total Hamming Distance', 'Medium', 'Count zero-one splits independently at each bit'],
    ['divide-two-integers', 'Divide Two Integers', 'Medium', 'Subtract shifted divisor multiples using bit operations']
  ]},

  { topic: 'Intervals', subtopic: 'Merge Intervals', questions: [
    ['merge-intervals', 'Merge Intervals', 'Medium', 'Sort intervals and extend the active merged range'],
    ['insert-interval', 'Insert Interval', 'Medium', 'Append before, merge overlaps, then append remaining intervals']
  ]},
  { topic: 'Intervals', subtopic: 'Overlapping Interval Detection', questions: [
    ['remove-covered-intervals', 'Remove Covered Intervals', 'Medium', 'Sort by start and descending end to identify coverage']
  ]},
  { topic: 'Intervals', subtopic: 'Interval Scheduling', questions: [
    ['minimum-number-of-arrows-to-burst-balloons', 'Minimum Number of Arrows to Burst Balloons', 'Medium', 'Reuse an arrow while balloon intervals overlap'],
    ['interval-list-intersections', 'Interval List Intersections', 'Medium', 'Advance the interval that ends first to find overlaps']
  ]},
  { topic: 'Intervals', subtopic: 'Meeting Room Problems', questions: [
    ['meeting-rooms', 'Meeting Rooms', 'Easy', 'Sort by start time and check adjacent overlaps'],
    ['meeting-rooms-ii', 'Meeting Rooms II', 'Medium', 'Track ongoing meetings in a min heap']
  ]},
  { topic: 'Intervals', subtopic: 'Sweep-Line Techniques', questions: [
    ['employee-free-time', 'Employee Free Time', 'Hard', 'Merge employee schedules to find shared gaps'],
    ['my-calendar-i', 'My Calendar I', 'Medium', 'Reject bookings that overlap stored intervals'],
    ['my-calendar-ii', 'My Calendar II', 'Medium', 'Track double-booked ranges while accepting events'],
    ['car-pooling', 'Car Pooling', 'Medium', 'Sort passenger pickup and drop-off events by location'],
    ['minimum-interval-to-include-each-query', 'Minimum Interval to Include Each Query', 'Hard', 'Sweep sorted intervals and queries with a size heap'],
    ['my-calendar-iii', 'My Calendar III', 'Hard', 'Track maximum concurrent bookings with an ordered sweep']
  ]},
  { topic: 'Intervals', subtopic: 'Interval Boundaries and Summaries', questions: [
    ['summary-ranges', 'Summary Ranges', 'Easy', 'Coalesce consecutive values into boundary ranges']
  ]},

  { topic: 'Math and Number Theory', subtopic: 'GCD and LCM', questions: [
    ['water-and-jug-problem', 'Water and Jug Problem', 'Medium', 'Use the greatest common divisor reachability condition'],
    ['find-greatest-common-divisor-of-array', 'Find Greatest Common Divisor of Array', 'Easy', 'Reduce the minimum and maximum values with Euclid’s algorithm']
  ]},
  { topic: 'Math and Number Theory', subtopic: 'Prime Numbers and Sieve', questions: [
    ['count-primes', 'Count Primes', 'Medium', 'Mark composite multiples with the Sieve of Eratosthenes'],
    ['closest-prime-numbers-in-range', 'Closest Prime Numbers in Range', 'Medium', 'Sieve a range and track adjacent primes']
  ]},
  { topic: 'Math and Number Theory', subtopic: 'Modular Arithmetic', questions: [
    ['super-pow', 'Super Pow', 'Medium', 'Reduce exponentiation using modular exponent rules']
  ]},
  { topic: 'Math and Number Theory', subtopic: 'Fast Exponentiation', questions: [
    ['powx-n', 'Pow(x, n)', 'Medium', 'Square the base while halving the exponent']
  ]},
  { topic: 'Math and Number Theory', subtopic: 'Counting and Combinatorics', questions: [
    ['pascal-triangle', 'Pascal’s Triangle', 'Easy', 'Build each row from adjacent values above'],
    ['number-of-dice-rolls-with-target-sum', 'Number of Dice Rolls With Target Sum', 'Medium', 'Count valid dice combinations with modular arithmetic']
  ]},
  { topic: 'Math and Number Theory', subtopic: 'Basic Number-Theory Problems', questions: [
    ['palindrome-number', 'Palindrome Number', 'Easy', 'Reverse half the digits and compare'],
    ['sqrtx', 'Sqrt(x)', 'Easy', 'Find the integer square root with binary search'],
    ['happy-number', 'Happy Number', 'Easy', 'Detect a cycle in repeated digit-square sums'],
    ['add-strings', 'Add Strings', 'Easy', 'Add decimal digits and carry without integer conversion'],
    ['excel-sheet-column-number', 'Excel Sheet Column Number', 'Easy', 'Convert base-26 letters to a numeric value'],
    ['factorial-trailing-zeroes', 'Factorial Trailing Zeroes', 'Medium', 'Count factors of five in the factorial'],
    ['integer-break', 'Integer Break', 'Medium', 'Maximize a product over integer partitions'],
    ['count-numbers-with-unique-digits', 'Count Numbers with Unique Digits', 'Medium', 'Count valid digit choices by position']
  ]}
].flatMap(group => group.questions.map(([slug, title, difficulty, pattern]) => {
  const problemUrl = `https://leetcode.com/problems/${slug}/`;
  return {
    id: `leetcode-${slug}`,
    title,
    topic: group.topic,
    subtopic: group.subtopic,
    difficulty,
    problemUrl,
    solutionUrl: `${problemUrl}solutions/`,
    pattern
  };
}));
