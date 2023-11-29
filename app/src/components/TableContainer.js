import '../styles/TableContainer.css';
import React, { useState, useEffect } from 'react';
import Table from './Table'
import TableSizeDropdown from './TableSizeDropdown';
import TableNavBar from './TableNavBar';

function TableContainer({reload=0, query, queryType, transactionType}) {
    /* STATES */

    // State of loaded data
    const [data, setData] = useState(null);

    // State of filtered data
    const [filteredData, setFilteredData] = useState(null);

    // State of current page
    const [page, setPage] = useState(null);
    const [pageSize, setPageSize] = useState(10);
    const [pageIndex, setPageIndex] = useState(0);
    const [numPages, setNumPages] = useState(1);

    /* HANDLE FILTER CHANGES */
    useEffect(
        () => {
            setPageIndex(
                0, 
                filterAndGeneratePage()
            )
        }, [reload]
    );

    /* HANDLE DATA FETCHING */
    useEffect(
        () => {
            filterAndGeneratePage();
        }, [data]
    );

    useEffect(
        () => {
            setNumPages(calcNumPages);
            generatePage();
        }, [filteredData]
    );

    /* HANDLE CHILD STATE VALUE UPDATES */
    useEffect (
        () => {
            let s = calcNumPages();
            if (s !== numPages) {
                setNumPages(s);
            }
            setPageIndex(0);
            generatePage();
        }, [pageSize]
    )

    useEffect(
        () => {
            generatePage();
        }, [pageIndex]
    )

    /* GETTERS FOR CHILDREN */
    function calcNumPages() {
        if (filteredData === null) {
            return 1;
        }
        return Math.ceil(filteredData['count'] / pageSize);
    }

    /* VALUE CHANGE HANDLERS */
    function handlePageSizeChange(val) {
        if (filteredData === null) {
            return;
        } else if (val === 'All') {
            val = filteredData['count'];
        }
        setPageSize(val);
    }

    function handlePageIndexChange(val) {
        if (val >= 0 && val < numPages) {
            setPageIndex(val);
        } else {
            setPageIndex(numPages - 1,);
        }
    }

    /* TABLE DATA FUNCTIONS */

    function applyPartition(tableData) {
        if (tableData === null) {
            return null;
        }
        let finalPageSize = tableData['count'] % pageSize;
        let start = pageSize * pageIndex;
        let end = (start + pageSize) <= tableData['count'] ? start + pageSize: start + finalPageSize;

        let currentPage = [];
        for (let i = start; i < end; i++) {
            currentPage.push(tableData['transaction_list'][i])
        }
        let tableClone = structuredClone(tableData);
        tableClone['transaction_list'] = currentPage;
        tableClone['count'] = end - start;
        return tableClone;
    }

    /* GENERATE FILTERED DATA FROM ALL DATA */
    function generateFilteredData(tableData) {
        if (tableData === null) {
            return null;
        }
        // Tracks size of filtered list
        let newCount = tableData['count'];

        // Unpack the filters
        let queryLabel = queryType;
        let queryString = query.toLowerCase();
        let tType = transactionType;

        // Approach: Look through each individual transaction and decide if it should be removed
        // This applies filters sequentially to one transaction at a time
        let finalData = []
        for (let i = 0; i < tableData['count']; i++) {
            let entry = data['transaction_list'][i];
            let pushEntry = true;

            // Apply type filter
            if (!(tType === 'all' || entry['gain_or_loss'] === tType)) {
                pushEntry = false;
            }
            // Apply search query 
            if (!(entry[queryLabel].toLowerCase().includes(queryString))) {
                pushEntry = false;
            }

            // Resolve filters
            if (pushEntry) {
                finalData.push(entry);
            } else {
                newCount--;
            }
        }

        // Reassign transaction list and count
        let tableClone = structuredClone(tableData)
        tableClone['transaction_list'] = finalData;
        tableClone['count'] = newCount;
        return tableClone;
    }

    /* GENERATE THE CURRENT PAGE TO DISPLAY IN TABLE FROM FILTERED DATA*/
    function generatePage() {
        if (filteredData === null) {
            return null;
        }

        setPage(applyPartition(filteredData));
    }

    /* FILTER DATA, THEN GENERATED CURRENT PAGE */
    function filterAndGeneratePage() {
        setFilteredData(generateFilteredData(data));
    }

    /* FETCH DATA FROM THE BACKEND -> SAVE FILTERED DATA IN STATE -> GENERATE PAGE */
    async function getMarketData() {
        try {
            const response = await fetch('http://127.0.0.1:8000/get_market_data/?amount=All',
                {
                    method: 'GET',
                    mode: 'cors',
                }
            )
            let res = await response.json();

            res = JSON.parse(JSON.stringify(res));

            setData(res);

        } catch(e) {
            console.error(e);
        }
    }

    return(
        <div className='table-container'>
            <div className='top-bar'>
                <button className='app-button refresh-button' onMouseDown={(e) => e.preventDefault()} onClick={getMarketData}>Refresh</button>
                <TableNavBar pageIndex={pageIndex} changePageIndex={handlePageIndexChange} numPages={numPages}/>
                <TableSizeDropdown handleClick={handlePageSizeChange} />
            </div>
            <Table data={page}/>
        </div>
    );
}

export default TableContainer;